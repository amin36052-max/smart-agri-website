document.addEventListener('DOMContentLoaded', () => {

    // رابط Webhook للشات في n8n (مقدم من المستخدم)
    const N8N_WEBHOOK_URL = "https://aminhero12.app.n8n.cloud/webhook/agricultural-chatbot";

    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // --- Session ID: unique per browser session/load to separate users/chats ---
    const SESSION_KEY = 'ai_assistant_session_id';
    function generateSessionId() {
        return 'sess-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
    }
    let currentSessionId = sessionStorage.getItem(SESSION_KEY);
    if (!currentSessionId) {
        currentSessionId = generateSessionId();
        sessionStorage.setItem(SESSION_KEY, currentSessionId);
    }
    console.log('AI assistant sessionId:', currentSessionId);

    // دالة مساعدة: تهرب أي HTML لتجنّب الحقن
    function escapeHTML(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // دالة مساعدة: تحويل نص بسيط إلى HTML مع دعم **bold** واحتفاظ بفواصل الأسطر
    function formatTextToHTML(text) {
        if (text == null) return '';
        let safe = escapeHTML(text);
        // تحويل **bold** إلى strong
        safe = safe.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // إذا النص يحتوي على رموز <br> كجزء من المحتوى (من n8n مثلاً)،
        // فسنعيد تحويلها بعد الهروب لتصبح فواصل أسطر فعلية.
        safe = safe.replace(/&lt;br\s*\/&gt;|&lt;br&gt;|&lt;br \/&gt;/gi, '<br>');
        // المحافظة على فواصل الأسطر العادية
        safe = safe.replace(/\r?\n/g, '<br>');
        return safe;
    }

    // دالة لإضافة الرسائل إلى الواجهة (تدعم تنسيق بسيط)
    function appendMessage(text, sender, isError = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        if (isError) {
            messageDiv.classList.add('error-message');
        }
        messageDiv.innerHTML = formatTextToHTML(text);
        chatMessages.appendChild(messageDiv);

        chatMessages.scrollTop = chatMessages.scrollHeight; // التمرير للأسفل
        return messageDiv;
    }

    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        // 1. عرض رسالة المستخدم وإفراغ الحقل
        appendMessage(message, 'user');
        userInput.value = '';
        sendButton.disabled = true;

        // 2. رسالة انتظار
        const waitingMessage = appendMessage('...المستشار يكتب', 'system');

        try {
            // 3. إرسال الطلب إلى Webhook
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                // 🌟 إرسال الرسالة ومُعرّف الجلسة إلى n8n 🌟
                body: JSON.stringify({ userMessage: message, sessionId: currentSessionId }),
            });

            // سجّل حالةHTTP ورؤوس الاستجابة لمساعدة التصحيح
            console.log('n8n response status:', response.status);
            try {
                console.log('n8n response headers:', Object.fromEntries(response.headers.entries()));
            } catch (e) {
                console.log('Could not enumerate headers', e);
            }

            // اقرأ النص الخام أولاً — بعض إعدادات n8n قد ترجع نص أو JSON بدون Content-Type مناسب
            const rawText = await response.text();
            console.log('n8n raw response text:', rawText);

            if (!response.ok) {
                // إذا لم يكن الرد 200، استخدم النص الخام كخطأ
                throw new Error(`فشل الاتصال بخادم n8n. (status ${response.status}) ${rawText}`);
            }

            // حاول تحويل النص إلى JSON، وإلا استخدم النص الخام كما هو
            let data;
            try {
                data = rawText ? JSON.parse(rawText) : null;
            } catch (e) {
                console.warn('n8n response is not valid JSON; using raw text for extraction');
                data = rawText;
            }

            // دالة مساعدة لاستخراج نص الرد من أشكال JSON مختلفة قد يرجعها n8n
            function extractAIResponse(obj) {
                if (obj == null) return null;
                if (typeof obj === 'string') {
                    const t = obj.trim();
                    return t.length ? t : null;
                }
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const r = extractAIResponse(item);
                        if (r) return r;
                    }
                    return null;
                }
                if (typeof obj === 'object') {
                    // فحص مفاتيح شائعة
                    const keys = ['aiResponse', 'response', 'answer', 'output', 'text', 'message', 'result', 'reply'];
                    for (const k of keys) {
                        if (k in obj && obj[k] != null) {
                            const r = extractAIResponse(obj[k]);
                            if (r) return r;
                        }
                    }

                    // OpenAI style: choices[0].message.content أو choices[0].text
                    if (obj.choices && Array.isArray(obj.choices) && obj.choices.length > 0) {
                        const choice = obj.choices[0];
                        if (choice.message && choice.message.content) return String(choice.message.content).trim();
                        if (choice.text) return String(choice.text).trim();
                    }

                    // بعض نودات n8n تُرجع المحتوى داخل .json أو .body
                    if ('json' in obj && obj.json != null) {
                        const r = extractAIResponse(obj.json);
                        if (r) return r;
                    }
                    if ('body' in obj && obj.body != null) {
                        const r = extractAIResponse(obj.body);
                        if (r) return r;
                    }

                    // أخيراً فحص جميع القيم
                    for (const k in obj) {
                        if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
                        const r = extractAIResponse(obj[k]);
                        if (r) return r;
                    }
                }
                return null;
            }

            let aiResponse = extractAIResponse(data) || null;

            // إذا كانت الاستجابة تحتوي على قوالب n8n غير مُفسرة (مثلاً "{{ $node... }}")، نعرض رسالة إرشادية
            if (aiResponse && (/\{\{.*\}\}/.test(aiResponse) || aiResponse.includes('$node'))) {
                console.warn('Received template-like aiResponse from n8n (not evaluated):', aiResponse, data);
                waitingMessage.innerHTML = formatTextToHTML('لم يتم تفسير استجابة n8n؛ يرجى تعديل الـ Workflow لإرجاع نص الإجابة. تحقق تعليمات الدعم في لوحة التحكم.');
                // ضع الاستجابة الكاملة في الكونسول لمساعدتك في التصحيح
                console.log('Full n8n response object:', data);
            } else {
                // تأكد من استخدام المتغير الصحيح. استخدم aiResponse (الذي استخرجناه أعلاه)
                aiResponse = aiResponse || 'عذراً، لم يتم العثور على إجابة.';
                waitingMessage.innerHTML = formatTextToHTML(aiResponse); // تحديث رسالة الانتظار (مع تنسيق)
            }

        } catch (error) {
            console.error("Error sending message:", error);
            waitingMessage.innerHTML = formatTextToHTML(`حدث ${error.message}`);
            waitingMessage.classList.remove('system-message');
            waitingMessage.classList.add('error-message');

        } finally {
            sendButton.disabled = false;
        }
    }

    // ربط الأحداث
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !sendButton.disabled) {
            sendMessage();
        }
    });
});