document.addEventListener('DOMContentLoaded', () => {
    
    // 1. تحديد زر التبديل (menu-toggle) والقائمة (main-nav)
    const menuToggle = document.querySelector('.menu-toggle');
    const mainNav = document.querySelector('#main-nav'); // يجب أن يكون ID في HTML هو main-nav

    if (menuToggle && mainNav) {
        // 2. مستمع الحدث
        menuToggle.addEventListener('click', () => {
            // إضافة وإزالة فئة is-open (التي تفتح القائمة في CSS)
            mainNav.classList.toggle('is-open');

            // تحديث حالة إمكانية الوصول
            const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true' || false;
            menuToggle.setAttribute('aria-expanded', !isExpanded);
        });
    }

    // ... (بقية الأكواد مثل كود الخدمات يجب أن تكون موجودة هنا)
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
