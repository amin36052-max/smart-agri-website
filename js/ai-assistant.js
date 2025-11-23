document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chat-messages');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');

    // *مهم:* يجب استبدال هذا برابط الـ Webhook الخاص بـ n8n
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

    // دالة إرسال الرسالة إلى n8n
    async function sendMessage() {
        const message = userInput.value.trim();
        if (message === "") return;

        // 1. عرض رسالة المستخدم
        appendMessage(message, 'user');
        userInput.value = '';

        // 2. عرض رسالة انتظار
        appendMessage('...الذكاء الاصطناعي يكتب', 'system');
        const lastMessage = chatMessages.lastElementChild;
        
        try {
            // 3. إرسال الطلب إلى Webhook الخاص بـ n8n
            const response = await fetch(N8N_WEBHOOK_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userMessage: message }),
            });

            if (!response.ok) {
                throw new Error('فشل الاتصال بالخادم، حالة: ' + response.status);
            }
            
            const data = await response.json();
            
            // 4. عرض استجابة الذكاء الاصطناعي
            const aiResponse = data.aiResponse || "عذراً، لم أتمكن من الحصول على إجابة.";
            lastMessage.textContent = aiResponse; // تحديث رسالة الانتظار بالإجابة
            
        } catch (error) {
            console.error("Error sending message:", error);
            lastMessage.textContent = `حدث ${error.message}`;
            lastMessage.classList.remove('system-message');
            lastMessage.classList.add('error-message');
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