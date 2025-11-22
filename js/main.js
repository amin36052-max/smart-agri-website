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
// الانتظار حتى يتم تحميل جميع عناصر الصفحة بالكامل
document.addEventListener('DOMContentLoaded', () => {
    
    // محددات صفحة الخدمات
    const serviceCards = document.querySelectorAll('.service-card');

    // التأكد من وجود بطاقات خدمات قبل تطبيق الـ event listener
    if (serviceCards.length > 0) {
        
        // تطبيق وظيفة النقر على كل بطاقة
        serviceCards.forEach(card => {
            card.addEventListener('click', () => {
                
                // أولاً: إلغاء التفعيل من أي بطاقة أخرى قد تكون نشطة
                serviceCards.forEach(otherCard => {
                    // إذا لم تكن البطاقة الحالية و كانت تحتوي على الفئة 'active'
                    if (otherCard !== card && otherCard.classList.contains('active')) {
                        otherCard.classList.remove('active');
                    }
                });

                // ثانياً: تبديل (Toggle) فئة 'active' على البطاقة التي تم النقر عليها
                card.classList.toggle('active');
            });
        });
    }

    // هنا يمكنك إضافة أي أكواد JavaScript تفاعلية أخرى تخص الموقع
});
