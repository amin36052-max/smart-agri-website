// UI enhancements: scroll reveal and header hide-on-scroll
(function () {
    // Reveal on scroll
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });

    document.querySelectorAll('.reveal, .service-card, .hero-content').forEach(el => {
        // avoid double opacity for already visible
        if (!el.classList.contains('is-visible')) {
            el.classList.add('reveal');
            io.observe(el);
        }
    });

    // Header hide on scroll
    let lastY = window.scrollY;
    const header = document.querySelector('.main-header');
    if (header) {
        let ticking = false;
        window.addEventListener('scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    const currentY = window.scrollY;
                    if (currentY > lastY && currentY > 120) {
                        header.classList.add('header--hidden');
                    } else {
                        header.classList.remove('header--hidden');
                    }
                    lastY = currentY;
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    // Smooth focus for keyboard users
    document.addEventListener('keyup', (e) => {
        if (e.key === 'Tab') document.documentElement.classList.add('user-is-tabbing');
    });
})();
