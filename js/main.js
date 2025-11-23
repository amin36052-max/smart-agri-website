document.addEventListener('DOMContentLoaded', () => {

    /* -----------------------------------------------------------------
       1. وظيفة قائمة الهامبرغر (Hamburger Menu Functionality)
       ----------------------------------------------------------------- */

    // تحديد زر التبديل (class="menu-toggle") والقائمة (id="main-nav")
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('#main-nav');

    if (menuToggle && mainNav) {
        // إضافة مستمع حدث عند النقر على الزر
        menuToggle.addEventListener('click', () => {

            // تبديل (إضافة/إزالة) فئة is-open التي تفتح القائمة في CSS
            mainNav.classList.toggle('is-open');

            // تحديث حالة إمكانية الوصول (Accessibility)
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }

    /* -----------------------------------------------------------------
       2. وظيفة تفعيل بطاقات الخدمات (Service Card Active State)
       ----------------------------------------------------------------- */

    // تحديد جميع بطاقات الخدمات
    const serviceCards = document.querySelectorAll('.service-card');

    if (serviceCards.length > 0) {
        serviceCards.forEach(card => {
            // إضافة مستمع حدث عند النقر على كل بطاقة
            card.addEventListener('click', () => {

                // أولاً: إزالة الفئة النشطة (active) من جميع البطاقات الأخرى
                serviceCards.forEach(otherCard => {
                    if (otherCard !== card && otherCard.classList.contains('active')) {
                        otherCard.classList.remove('active');
                    }
                });

                // ثانياً: تبديل الفئة النشطة (active) للبطاقة التي تم النقر عليها
                card.classList.toggle('active');
            });
        });
    }
});

/* -----------------------------------------------------------------
   3. وظيفة الأكورديون (Accordion for Service Details)
   ----------------------------------------------------------------- */

const moreInfoButtons = document.querySelectorAll('.more-info-toggle');

moreInfoButtons.forEach(button => {
    button.addEventListener('click', (e) => {
        // منع حدث النقر من الفقاعات إلى البطاقة (حتى لا يتسبب في تبديل حالة البطاقة كاملة)
        e.stopPropagation();

        // الوصول إلى العنصر الأب (البطاقة)
        const serviceCard = button.closest('.service-card');
        if (!serviceCard) return;

        // تحديد محتوى التفاصيل المخفي داخل البطاقة
        const details = serviceCard.querySelector('.service-details');
        if (!details) return;

        // تبديل فئة expanded في محتوى التفاصيل
        details.classList.toggle('expanded');

        // تبديل فئة active للزر نفسه (لتغيير لونه أو مظهره)
        button.classList.toggle('active');

        // تغيير النص من "اكتشف المزيد" إلى "إغلاق" عند الفتح (اختياري)
        if (details.classList.contains('expanded')) {
            button.textContent = 'إغلاق التفاصيل';
        } else {
            button.textContent = 'اكتشف المزيد';
        }
    });
});

/* -----------------------------------------------------------------
   4. معالج نموذج الاتصال (Contact Form Handler)
   ----------------------------------------------------------------- */

const contactForm = document.getElementById('contact-form');
const formMessage = document.getElementById('form-message');

if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();

        // جمع بيانات النموذج
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        // التحقق من عدم ترك حقل فارغ
        if (!name || !email || !subject || !message) {
            showFormMessage('يرجى ملء جميع الحقول.', 'error');
            return;
        }

        // التحقق من صيغة البريد الإلكتروني
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            showFormMessage('يرجى إدخال بريد إلكتروني صحيح.', 'error');
            return;
        }

        // جمع البيانات في كائن
        const formData = {
            name: name,
            email: email,
            subject: subject,
            message: message,
            timestamp: new Date().toISOString()
        };

        // إرسال البيانات إلى Formspree (مناسب لاستضافة GitHub Pages)
        const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwpzdkpz';

        // نستخدم FormData لإرسال الحقول بالطريقة المتوقعة من Formspree
        const fd = new FormData();
        fd.append('name', name);
        fd.append('email', email);
        fd.append('subject', subject);
        fd.append('message', message);

        fetch(FORMSPREE_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json'
            },
            body: fd
        })
            .then(async (response) => {
                // Formspree يرجع JSON عند النجاح أو الخطأ
                const data = await response.json().catch(() => ({}));
                if (response.ok) {
                    showFormMessage(data.message || 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.', 'success');
                    contactForm.reset();
                } else {
                    console.error('Formspree error:', data);
                    showFormMessage(data.error || 'حدث خطأ عند إرسال الرسالة. يرجى المحاولة لاحقاً.', 'error');
                }
            })
            .catch(error => {
                console.error('خطأ:', error);
                showFormMessage('حدث خطأ في الاتصال بخدمة الإرسال. يرجى المحاولة لاحقاً.', 'error');
            });
    });
}

// دالة عرض رسالة النموذج
function showFormMessage(message, type) {
    const formMessage = document.getElementById('form-message');
    if (!formMessage) return;

    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;
    formMessage.style.display = 'block';

    // إخفاء الرسالة بعد 5 ثوان
    setTimeout(() => {
        formMessage.style.display = 'none';
    }, 5000);
}
