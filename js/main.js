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
// ... (الأكواد السابقة هنا: الهامبرغر وبطاقات الخدمات) ...

    /* -----------------------------------------------------------------
       3. وظيفة الأكورديون (Accordion for Service Details)
       ----------------------------------------------------------------- */
    
    const moreInfoButtons = document.querySelectorAll('.more-info-toggle');

    moreInfoButtons.forEach(button => {
        button.addEventListener('click', () => {
            // الوصول إلى العنصر الأب (البطاقة)
            const serviceCard = button.closest('.service-card');
            // تحديد محتوى التفاصيل المخفي داخل البطاقة
            const details = serviceCard.querySelector('.service-details');

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
