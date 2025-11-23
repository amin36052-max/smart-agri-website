document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // رابط الـ Webhook الخاص بـ n8n (شات)
    const N8N_WEBHOOK_URL = "https://aminmeabed12.app.n8n.cloud/webhook/b29ae7ed-c2a8-410d-8da0-17ebdfbe8558/chat";

    // دالة إنشاء وإضافة رسالة إلى واجهة الدردشة
    function appendMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);
        messageDiv.textContent = text;
        chatMessages.appendChild(messageDiv);

        // التمرير التلقائي إلى أسفل النافذة
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // دالة إرسال الرسالة إلى n8n (محسنة: تعطيل الإدخال أثناء الانتظار، معالجة أخطاء أفضل)
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        // عرض رسالة المستخدم
        appendMessage(message, 'user');
        userInput.value = '';

        // عرض رسالة انتظار
        appendMessage('...الذكاء الاصطناعي يكتب', 'system');
        const lastMessage = chatMessages.lastElementChild;

        // تعطيل زر الإرسال وحقل الإدخال لمنع إرسال متعدد
        sendButton.disabled = true;
        userInput.disabled = true;

        try {
            const payload = { userMessage: message };

            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                // حاول قراءة رسالة الخطأ من الخادم إن أمكن
                let errText = `حالة: ${response.status}`;
                try {
                    const errJson = await response.json();
                    if (errJson && errJson.message) errText = errJson.message;
                } catch (e) {
                    // تجاهل خطأ التحليل
                }
                throw new Error('فشل الاتصال بالخادم، ' + errText);
            }

            // قراءة JSON من الاستجابة
            let data = {};
            try {
                data = await response.json();
            } catch (e) {
                throw new Error('الخادم لم يُرجع JSON صالح');
            }

            // دعم أشكال مختلفة لاستجابة n8n: { aiResponse: '...' } أو { result: { aiResponse: '...' } } أو array
            let aiResponse = null;
            if (data.aiResponse) aiResponse = data.aiResponse;
            else if (data.result && data.result.aiResponse) aiResponse = data.result.aiResponse;
            else if (Array.isArray(data) && data[0] && data[0].aiResponse) aiResponse = data[0].aiResponse;
            else if (data[0] && data[0].json && data[0].json.aiResponse) aiResponse = data[0].json.aiResponse;
            else if (data.message) aiResponse = data.message;

            if (!aiResponse) aiResponse = 'عذراً، لم أتمكن من الحصول على إجابة من الخادم.';

            // تحديث رسالة الانتظار بالإجابة الحقيقية
            lastMessage.textContent = aiResponse;

        } catch (error) {
            console.error('Error sending message:', error);
            lastMessage.textContent = `حدث خطأ: ${error.message}`;
            lastMessage.classList.remove('system-message');
            lastMessage.classList.add('error-message');
        } finally {
            // إعادة تفعيل الإدخال
            sendButton.disabled = false;
            userInput.disabled = false;
            userInput.focus();
        }
    }

    // ربط النقر بزر الإرسال والضغط على مفتاح Enter
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
});