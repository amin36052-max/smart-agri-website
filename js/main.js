document.addEventListener('DOMContentLoaded', () => {
    // كود قائمة الهامبرغر
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('#main-nav');

    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', () => {
            // تبديل فئة is-open التي تفتح القائمة في CSS
            mainNav.classList.toggle('is-open');

            // تحديث حالة إمكانية الوصول (Accessibility)
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // (حافظ على الكود القديم الخاص ببطاقات الخدمات هنا بعد الكود الجديد)
    const serviceCards = document.querySelectorAll('.service-card');
    if (serviceCards.length > 0) {
        // ... (بقية كود الخدمات)
    }
});
    

    // 💡 كود الخدمات القديم (يجب أن يكون موجوداً أيضاً) 💡
    const serviceCards = document.querySelectorAll('.service-card');
    if (serviceCards.length > 0) {
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                serviceCards.forEach(otherCard => {
                    if (otherCard !== card && otherCard.classList.contains('active')) {
                        otherCard.classList.remove('active');
                    }
                });
                card.classList.toggle('active');
            });
        });
    }
