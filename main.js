import './style.css'
import { getCardData } from './firebase.js';

console.log("Responsive Digital Card Initialized");

document.addEventListener('DOMContentLoaded', () => {
    fetchDataAndRender();
    setupModal();
});

async function fetchDataAndRender() {
    try {
        const response = await fetch('/api/card');

        const data = await response.json();
        
        if (!data) throw new Error('Banco de dados local vazio ou inacessível.');
        populateUI(data);
        applySEOAndTracking(data);
        applyResponsiveBackground(data.backgrounds);

        // Hide loader and run entry animations
        gsap.to('#loader', {
            opacity: 0, duration: 0.5, onComplete: () => {
                document.getElementById('loader').style.display = 'none';
                document.getElementById('app').style.opacity = 1;
                runGSAPAnimations();
            }
        });

        // Listen for window resize to change background
        window.addEventListener('resize', () => applyResponsiveBackground(data.backgrounds));

    } catch (error) {
        console.error("Failed to load data:", error);
        document.getElementById('loader').innerHTML = '<p style="color:white; text-align:center; padding: 20px;">Servidor Local Inativo.<br>Certifique-se de que o backend Node.js está rodando.</p>';
    }
}

function applyResponsiveBackground(bgs) {
    const width = window.innerWidth;
    let bgUrl = bgs.mobileUrl;

    if (width >= 1024) {
        bgUrl = bgs.desktopUrl;
    } else if (width >= 768) {
        bgUrl = bgs.tabletUrl;
    }

    const bodyBg = document.getElementById('body-bg');
    bodyBg.style.backgroundImage = `url('${bgUrl}')`;
    if (bgs.backgroundColor) {
        bodyBg.style.backgroundColor = bgs.backgroundColor;
    }
}

function populateUI(data) {
    // Header
    if (data.header) {
        if (data.header.logoUrl) {
            const logoImg = document.getElementById('hdr-logo-img');
            const logoText = document.getElementById('hdr-logo-text-block');
            if (logoImg) {
                logoImg.src = data.header.logoUrl;
                logoImg.style.display = 'block';
                if (logoText) logoText.style.display = 'none';

                // Set Favicon
                let link = document.querySelector("link[rel~='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.getElementsByTagName('head')[0].appendChild(link);
                }
                link.href = data.header.logoUrl;
            }
        } else if (data.header.tagline) {
            const parts = data.header.tagline.split('\n');
            document.getElementById('hdr-logo-text-main').textContent = parts[0] || 'FINANCE LOGO';
            document.getElementById('hdr-tagline').textContent = parts.slice(1).join(' ') || 'TAGLINE GOES HERE';
        }
    }

    document.getElementById('hdr-topQr').src = data.header.topQrCodeUrl;
    document.getElementById('modal-qr-img').src = data.header.topQrCodeUrl; // Set modal image

    // Profile
    document.getElementById('prof-name').textContent = data.profile.name;
    document.getElementById('prof-title').textContent = data.profile.title;

    const waUrl = `https://wa.me/${data.profile.whatsappNumber}`;
    document.getElementById('btn-wa').href = waUrl;
    document.getElementById('txt-wa').innerHTML = data.profile.whatsappText.replace('\n', '<br>');

    // Links (Pills)
    const linksContainer = document.getElementById('links-container');
    linksContainer.innerHTML = '';
    if (data.links) {
        data.links.forEach(link => {
            if (!link.displayText && !link.url) return; // Skip empty links
            const el = document.createElement('a');
            el.className = `link-pill gsap-link`;
            el.href = link.url;
            el.target = '_blank';

            // Icon mapping from the new 'icon' property in admin
            let colorClass = 'bg-black';
            let iconType = 'fas fa-globe';
            let customStyle = '';

            const iconKey = (link.icon || '').toLowerCase();
            const iconMap = {
                'globe': { icon: 'fas fa-globe', bg: 'bg-black' },
                'instagram': { icon: 'fab fa-instagram', bg: 'bg-instagram' },
                'facebook': { icon: 'fab fa-facebook-f', bg: 'bg-facebook' },
                'youtube': { icon: 'fab fa-youtube', bg: 'bg-youtube' },
                'tiktok': { icon: 'fab fa-tiktok', bg: 'bg-tiktok' },
                'pinterest': { icon: 'fab fa-pinterest', bg: 'bg-pinterest' },
                'x-twitter': { icon: 'fab fa-x-twitter', bg: 'bg-x-twitter' },
                'linkedin': { icon: 'fab fa-linkedin-in', bg: 'bg-linkedin' },
                'reddit': { icon: 'fab fa-reddit-alien', bg: 'bg-reddit' },
                'google': { icon: 'fab fa-google', bg: 'bg-google' },
                'spotify': { icon: 'fab fa-spotify', bg: 'bg-spotify' },
                'email': { icon: 'fas fa-envelope', bg: 'bg-email' }
            };

            if (iconMap[iconKey]) {
                iconType = iconMap[iconKey].icon;
                colorClass = iconMap[iconKey].bg;
            }

            // OVERRIDE with custom color if it's not the default black/empty
            // We consider #000000 as the "use social color" trigger
            if (link.customColor && link.customColor !== '#000000') {
                colorClass = ''; // Clear the class to use inline style
                customStyle = `background: ${link.customColor};`;
            }

            el.innerHTML = `
                <div class="link-icon ${colorClass}" style="${customStyle}"><i class="${iconType}"></i></div>
                <div class="link-text">${link.displayText}</div>
            `;
            linksContainer.appendChild(el);
        });
    }

    // Address & Review
    document.getElementById('addr-title').textContent = data.addressBlock.title;
    document.getElementById('addr-lines').innerHTML = data.addressBlock.lines.replace(/\n/g, '<br>');

    document.getElementById('rev-title').textContent = data.reviewBlock.title;
    document.getElementById('rev-subtext').textContent = data.reviewBlock.subtext.replace(/\n/g, '<br>');
    document.getElementById('rev-qr').src = data.reviewBlock.qrCodeUrl;

    // Products (Carousel with 12 items)
    document.getElementById('prod-title').textContent = data.products.sectionTitle;
    const prodContainer = document.getElementById('products-container');
    const waNumber = data.profile.whatsappNumber;
    prodContainer.innerHTML = '';
    
    if (data.products.items) {
        data.products.items.forEach(prod => {
            const waMessage = encodeURIComponent(`Quero mais informações sobre ${prod.title}`);
            const card = document.createElement('div');
            card.className = 'product-card gsap-prod';
            
            card.innerHTML = `
                <img src="${prod.imgUrl}" alt="${prod.title}" class="product-img">
                <p class="product-title">${prod.title}</p>
                <div class="prod-btn-row">
                    ${prod.pdfUrl ? `<a href="${prod.pdfUrl}" target="_blank" class="btn-mini btn-pdf"><i class="fas fa-file-pdf"></i> PDF</a>` : ''}
                    <a href="https://wa.me/${waNumber}?text=${waMessage}" target="_blank" class="btn-mini btn-zap-mini"><i class="fab fa-whatsapp"></i> ZAP</a>
                </div>
            `;
            prodContainer.appendChild(card);
        });
    }

    // Carousel Navigation Logic
    const nextBtn = document.getElementById('next-btn');
    const prevBtn = document.getElementById('prev-btn');
    if (nextBtn && prevBtn && prodContainer) {
        nextBtn.onclick = () => {
            const scrollAmount = prodContainer.clientWidth * 0.8;
            prodContainer.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        };
        prevBtn.onclick = () => {
            const scrollAmount = prodContainer.clientWidth * 0.8;
            prodContainer.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        };
    }

    // Footer
    if (data.footer && data.footer.text) {
        document.getElementById('footer-text').innerHTML = data.footer.text.replace(/\n/g, '<br>');
    }
}

function setupModal() {
    const modal = document.getElementById('qr-modal');
    const openBtn = document.getElementById('open-qr-modal');
    const closeBtn = document.getElementById('close-modal');

    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        gsap.to(modal, { opacity: 1, duration: 0.3 });
        gsap.fromTo('.gsap-modal-content', { y: 50, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, delay: 0.1, ease: 'back.out(1.5)' });
    });

    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
    });

    function closeModal() {
        gsap.to('.gsap-modal-content', { y: 50, opacity: 0, duration: 0.2 });
        gsap.to(modal, {
            opacity: 0, duration: 0.3, delay: 0.1, onComplete: () => {
                modal.style.display = 'none';
            }
        });
    }
}

function runGSAPAnimations() {
    const tl = gsap.timeline();

    // Profile image slides up
    tl.from('.gsap-prof-img', { y: 50, opacity: 0, duration: 0.8, ease: 'power2.out' })
        // Header elements stagger in
        .from('.gsap-stagger-top', { x: 30, opacity: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }, '-=0.4')
        // Links scale in
        .from('.gsap-link', { scale: 0.9, opacity: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(1.5)' }, '-=0.2')
        // Info panels fade and slide up
        .from('.gsap-stagger-info', { y: 20, opacity: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out' }, '-=0.2');
}

function applySEOAndTracking(data) {
    if (data.seo) {
        if (data.seo.title) {
            document.title = data.seo.title;
            const ogTitle = document.getElementById('og-title');
            if (ogTitle) ogTitle.content = data.seo.title;
        }
        if (data.seo.description) {
            const metaDesc = document.getElementById('seo-description');
            if (metaDesc) metaDesc.content = data.seo.description;

            const ogDesc = document.getElementById('og-description');
            if (ogDesc) ogDesc.content = data.seo.description;
        }
    }

    if (data.tracking) {
        // Facebook Pixel
        if (data.tracking.fbPixel && data.tracking.fbPixel.trim() !== '') {
            const pixelId = data.tracking.fbPixel.trim();
            const fbScript = document.createElement('script');
            fbScript.innerHTML = `
                !function(f,b,e,v,n,t,s)
                {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                n.queue=[];t=b.createElement(e);t.async=!0;
                t.src=v;s=b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t,s)}(window, document,'script',
                'https://connect.facebook.net/en_US/fbevents.js');
                fbq('init', '${pixelId}');
                fbq('track', 'PageView');
            `;
            document.head.appendChild(fbScript);

            const fbNoscript = document.createElement('noscript');
            fbNoscript.innerHTML = `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1"/>`;
            document.head.appendChild(fbNoscript);
        }

        // GTM Head
        if (data.tracking.gtmHead && data.tracking.gtmHead.trim() !== '') {
            const gtmHeadContainer = document.getElementById('tracking-head');
            if (gtmHeadContainer) {
                // We use document.createRange().createContextualFragment to execute <script> tags passed as text
                const fragment = document.createRange().createContextualFragment(data.tracking.gtmHead);
                gtmHeadContainer.appendChild(fragment);
            }
        }

        // GTM Body
        if (data.tracking.gtmBody && data.tracking.gtmBody.trim() !== '') {
            const gtmBodyContainer = document.getElementById('tracking-body');
            if (gtmBodyContainer) {
                const fragment = document.createRange().createContextualFragment(data.tracking.gtmBody);
                gtmBodyContainer.appendChild(fragment);
            }
        }

        // Pinterest Tag
        if (data.tracking.pinterest && data.tracking.pinterest.trim() !== '') {
            const fragment = document.createRange().createContextualFragment(data.tracking.pinterest);
            document.head.appendChild(fragment);
        }

        // LinkedIn Tag
        if (data.tracking.linkedin && data.tracking.linkedin.trim() !== '') {
            const fragment = document.createRange().createContextualFragment(data.tracking.linkedin);
            document.head.appendChild(fragment);
        }
    }
}
