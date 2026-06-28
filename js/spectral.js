// modal interactions for feature cards
(function () {
    const data = {
        health: {
            title: 'صحة النبات',
            body: `<p>نراقب صحة النبات ونكتشف الإجهاد والأمراض ونقص العناصر مبكرًا باستخدام صور الطيف والـ NDVI.</p>`,
            images: [
                { src: 'images/صحة نبات/ndvi 12-8-2023.png', date: '12-08-2023' },
                { src: 'images/صحة نبات/NDVI 15-5-2025.png', date: '15-05-2025' },
                { src: 'images/صحة نبات/ndvi 22-8-2024.png', date: '22-08-2024' },
                { src: 'images/صحة نبات/ndvi 15-2-2026.png', date: '15-02-2026' }
            ]
        },
        salinity: {
            title: 'الملوحة',
            body: `<p>نكتشف مناطق الملوحة عبر تحليل الانعكاس الطيفي ونقترح حلولاً لتحسين خصوبة التربة وإدارة المحاصيل الملائمة.</p>`,
            images: [
                { src: 'images/ملوحه/EC 04-11-2023.png', date: '04-11-2023' },
                { src: 'images/ملوحه/EC 14-10-2024.png', date: '14-10-2024' },
                { src: 'images/ملوحه/EC 20-10-2025.png', date: '20-10-2025' },
                { src: 'images/ملوحه/EC 7-5-2026.png', date: '07-05-2026' }
            ]
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
        bodyEl.innerHTML = `
            ${info.body}
            <div class="modal-preview">
                <img id="modal-preview-image" src="" alt="${info.title}" />
                <div id="modal-preview-caption" class="modal-preview-caption"></div>
            </div>
            <div class="modal-gallery" id="modal-gallery"></div>
        `;
        // populate gallery
        const gallery = bodyEl.querySelector('#modal-gallery');
        const previewImage = bodyEl.querySelector('#modal-preview-image');
        const previewCaption = bodyEl.querySelector('#modal-preview-caption');

        function setPreview(item, index) {
            if (!previewImage || !previewCaption || !item) return;
            previewImage.src = item.src;
            previewImage.alt = `${info.title} - ${item.date || ''}`;
            previewCaption.textContent = item.date || '';

            bodyEl.querySelectorAll('.modal-gallery-item').forEach((el) => {
                el.classList.toggle('is-active', Number(el.dataset.index) === index);
            });
        }

        if (gallery && info.images) {
            gallery.innerHTML = info.images.map((item, index) => `
                <figure class="modal-gallery-item" data-index="${index}" data-src="${item.src}" data-date="${item.date || ''}">
                    <img src="${item.src}" alt="${info.title} ${item.date || ''}" loading="lazy" />
                    <figcaption>${item.date || ''}</figcaption>
                </figure>
            `).join('');

            gallery.querySelectorAll('.modal-gallery-item').forEach((itemEl) => {
                itemEl.addEventListener('click', () => {
                    setPreview(
                        { src: itemEl.dataset.src, date: itemEl.dataset.date },
                        Number(itemEl.dataset.index)
                    );
                });
            });

            setPreview(info.images[0], 0);
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
