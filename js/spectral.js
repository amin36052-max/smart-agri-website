// modal interactions for feature cards
(function () {
    const data = {
        health: {
            title: 'صحة النبات',
            body: `<p>نراقب صحة النبات ونكتشف الإجهاد والأمراض ونقص العناصر مبكرًا باستخدام صور الطيف والـ NDVI. يمكننا تحديد بقع الإجهاد بدقة والتوصية بإجراءات علاجية.</p>`,
            images: ['images/صحه النبات.jpeg']
        },
        moisture: {
            title: 'رطوبة التربة',
            body: `<p>نحدد مستويات رطوبة التربة بدقة من صور متعددة الأطياف، مما يساعد على توجيه الري بشكل ذكي لتوفير المياه وزيادة الإنتاج.</p>`,
            images: ['images/الرطوبه.jpeg']
        },
        salinity: {
            title: 'الملوحة',
            body: `<p>نكتشف مناطق الملوحة عبر تحليل الانعكاس الطيفي ونقترح حلولاً لتحسين خصوبة التربة وإدارة المحاصيل الملائمة.</p>`,
            images: ['images/الاملاح.jpeg']
        }
    };

    const modal = document.getElementById('spectral-modal');
    if (!modal) return;
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    const closeBtn = modal.querySelector('.modal-close');

    function openModal(key) {
        const info = data[key];
        if (!info) return;
        titleEl.textContent = info.title;
        bodyEl.innerHTML = info.body + '<div class="modal-gallery" id="modal-gallery"></div>';
        // populate gallery
        const gallery = bodyEl.querySelector('#modal-gallery');
        if (gallery && info.images) {
            gallery.innerHTML = info.images.map(src => `<img src="${src}" alt="" />`).join('');
        }
        modal.setAttribute('aria-hidden', 'false');
        document.documentElement.style.overflow = 'hidden';
    }
    function closeModal() {
        modal.setAttribute('aria-hidden', 'true');
        document.documentElement.style.overflow = '';
    }

    document.querySelectorAll('.feature-card').forEach(card => {
        card.addEventListener('click', () => openModal(card.dataset.key));
        card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openModal(card.dataset.key); });
    });
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
})();
