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
    
// الانتظار حتى يتم تحميل جميع عناصر الصفحة
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. الحصول على جميع بطاقات الخدمات
    const serviceCards = document.querySelectorAll('.service-card');

    // 2. تكرار (Loop) على كل بطاقة لإضافة مستمع حدث النقر
    serviceCards.forEach(card => {
        card.addEventListener('click', () => {
            
            // 3. إلغاء تفعيل (إزالة فئة 'active') من أي بطاقة أخرى قد تكون نشطة
            serviceCards.forEach(otherCard => {
                if (otherCard !== card && otherCard.classList.contains('active')) {
                    otherCard.classList.remove('active');
                }
            });

            // 4. تبديل (Toggle) فئة 'active' على البطاقة التي تم النقر عليها
            // إذا كانت نشطة، يتم إلغاء تنشيطها. إذا لم تكن، يتم تنشيطها.
            card.classList.toggle('active');

            // ملاحظة: يمكنك هنا إضافة المزيد من الإجراءات، مثل التمرير إلى البطاقة أو فتح نافذة منبثقة.
        });
    });

    // ----------------------------------------------------
    // إضافة حركة تفاعلية بسيطة لقوائم التنقل (كمثال)
    // ----------------------------------------------------
    const navLinks = document.querySelectorAll('nav ul li a');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            // يمكن إضافة تأثير هنا قبل الانتقال إلى الصفحة الجديدة
            // e.preventDefault(); // لإيقاف الانتقال إذا أردت إظهار تأثير أولاً
            // console.log(يتم الانتقال إلى: ${link.href});
        });
    });

});
