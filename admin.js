// admin.js - Versão Carrossel 12 Itens

let _fullData = null;

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    const form = document.getElementById('admin-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await saveData();
        });
    }
});

async function loadData() {
    try {
        const response = await fetch('/api/card');
        if (!response.ok) throw new Error('Nao foi possivel carregar os dados do card.');
        const data = await response.json();
        _fullData = data;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        // Identidade
        setVal('hdr-logo', data.header?.logoUrl);
        setVal('hdr-tagline', data.header?.tagline);
        setVal('hdr-qrTop', data.header?.topQrCodeUrl);
        setVal('bg-color', data.backgrounds?.backgroundColor);
        setVal('bg-mobile', data.backgrounds?.mobileUrl);
        setVal('bg-tablet', data.backgrounds?.tabletUrl);
        setVal('bg-desktop', data.backgrounds?.desktopUrl);

        // Perfil
        setVal('prof-name', data.profile?.name);
        setVal('prof-title', data.profile?.title);
        setVal('prof-waNumber', data.profile?.whatsappNumber);
        setVal('prof-waText', data.profile?.whatsappText);

        // Links 1, 2, 3
        if (data.links) {
            for (let i = 1; i <= 3; i++) {
                const l = data.links[i - 1] || {};
                setVal(`link-${i}-text`, l.displayText);
                setVal(`link-${i}-icon`, l.icon);
                setVal(`link-${i}-color`, l.customColor);
                setVal(`link-${i}-url`, l.url);
            }
        }

        // Serviços - Gerar 12 Slots Dinamicamente
        setVal('prod-title', data.products?.sectionTitle);
        const slotsContainer = document.getElementById('service-slots-container');
        if (slotsContainer) {
            slotsContainer.innerHTML = '';
            for (let i = 1; i <= 12; i++) {
                const item = data.products?.items?.[i - 1] || {};
                const div = document.createElement('div');
                div.className = 'link-block';
                div.innerHTML = `
                    <label style="color:#000; font-weight:900;">CAIXA ${i}</label>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Título</label>
                            <input type="text" id="prod-${i}-name" value="${item.title || ''}">
                        </div>
                        <div class="form-group">
                            <label>Foto do Serviço</label>
                            <input type="text" id="prod-${i}-img" value="${item.imgUrl || ''}">
                            <input type="file" onchange="uploadFile(this, 'prod-${i}-img')" style="font-size:0.7rem; margin-top:5px;">
                            <small id="status-prod-${i}-img" style="display:none;"></small>
                        </div>
                        <div class="form-group">
                            <label>Arquivo PDF (Download)</label>
                            <input type="text" id="prod-${i}-pdf" value="${item.pdfUrl || ''}">
                            <input type="file" onchange="uploadFile(this, 'prod-${i}-pdf')" style="font-size:0.7rem; margin-top:5px;">
                            <small id="status-prod-${i}-pdf" style="display:none;"></small>
                        </div>
                        <div class="form-group">
                            <label>Link do Video</label>
                            <input type="text" id="prod-${i}-video" value="${item.videoUrl || ''}" placeholder="YouTube, Vimeo, Drive...">
                        </div>
                    </div>
                `;
                slotsContainer.appendChild(div);
            }
        }

        // Endereço e Outros
        setVal('addr-title', data.addressBlock?.title);
        setVal('addr-lines', data.addressBlock?.lines);
        setVal('rev-title', data.reviewBlock?.title);
        setVal('rev-subtext', data.reviewBlock?.subtext);
        setVal('rev-qr', data.reviewBlock?.qrCodeUrl);

        setVal('seo-title', data.seo?.title);
        setVal('seo-desc', data.seo?.description);
        setVal('seo-image', data.seo?.image);
        setVal('tracking-fb-pixel', data.tracking?.fbPixel);
        setVal('tracking-gtm-head', data.tracking?.gtmHead);
        setVal('tracking-gtm-body', data.tracking?.gtmBody);
        setVal('tracking-pinterest', data.tracking?.pinterest);
        setVal('tracking-linkedin', data.tracking?.linkedin);
        setVal('sec-email', data.adminEmail);
        setVal('sec-password', data.adminPassword);
        setVal('sec-recovery-key', data.securityKey);

    } catch (e) { console.error(e); }
}

async function saveData() {
    if (!_fullData) return;
    const getVal = (id) => document.getElementById(id)?.value || '';

    _fullData.header.logoUrl = getVal('hdr-logo');
    _fullData.header.tagline = getVal('hdr-tagline');
    _fullData.header.topQrCodeUrl = getVal('hdr-qrTop');
    _fullData.backgrounds.backgroundColor = getVal('bg-color');
    _fullData.backgrounds.mobileUrl = getVal('bg-mobile');
    _fullData.backgrounds.tabletUrl = getVal('bg-tablet');
    _fullData.backgrounds.desktopUrl = getVal('bg-desktop');

    _fullData.profile.name = getVal('prof-name');
    _fullData.profile.title = getVal('prof-title');
    _fullData.profile.whatsappNumber = getVal('prof-waNumber');
    _fullData.profile.whatsappText = getVal('prof-waText');

    // Salvar Links
    _fullData.links = [];
    for (let i = 1; i <= 3; i++) {
        _fullData.links.push({
            displayText: getVal(`link-${i}-text`),
            icon: getVal(`link-${i}-icon`),
            customColor: getVal(`link-${i}-color`),
            url: getVal(`link-${i}-url`)
        });
    }

    // Salvar 12 Serviços
    _fullData.products.sectionTitle = getVal('prod-title');
    _fullData.products.items = [];
    for (let i = 1; i <= 12; i++) {
        const title = getVal(`prod-${i}-name`);
        const imgUrl = getVal(`prod-${i}-img`);
        const pdfUrl = getVal(`prod-${i}-pdf`);
        const videoUrl = getVal(`prod-${i}-video`);
        if (title || imgUrl || pdfUrl || videoUrl) {
            _fullData.products.items.push({ title, imgUrl, pdfUrl, videoUrl });
        }
    }

    _fullData.addressBlock.title = getVal('addr-title');
    _fullData.addressBlock.lines = getVal('addr-lines');
    _fullData.reviewBlock.title = getVal('rev-title');
    _fullData.reviewBlock.subtext = getVal('rev-subtext');
    _fullData.reviewBlock.qrCodeUrl = getVal('rev-qr');

    _fullData.seo = { 
        title: getVal('seo-title'), 
        description: getVal('seo-desc'),
        image: getVal('seo-image')
    };
    _fullData.tracking = { 
        fbPixel: getVal('tracking-fb-pixel'), 
        gtmHead: getVal('tracking-gtm-head'), 
        gtmBody: getVal('tracking-gtm-body'),
        pinterest: getVal('tracking-pinterest'),
        linkedin: getVal('tracking-linkedin')
    };
    _fullData.adminEmail = getVal('sec-email');
    _fullData.adminPassword = getVal('sec-password');
    _fullData.securityKey = getVal('sec-recovery-key');

    try {
        const response = await fetch('/api/card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(_fullData)
        });
        if (!response.ok) throw new Error('Falha ao salvar no SQLite.');

        const toast = document.getElementById('toast');
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    } catch (e) { alert("Erro ao salvar."); }
}

window.checkLogin = async function () {
    const email = document.getElementById('admin-email').value;
    const pwd = document.getElementById('admin-password').value;
    try {
        const response = await fetch('/api/card');
        const data = await response.json();
        if (pwd === data.adminPassword && email.toLowerCase() === data.adminEmail.toLowerCase()) {
            document.getElementById('login-screen').style.display = 'none';
            document.getElementById('admin-app').style.display = 'flex';
        } else {
            document.getElementById('login-error').style.display = 'block';
        }
    } catch (e) { alert("Erro de conexão."); }
};

window.logout = function () {
    document.getElementById('admin-password').value = '';
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
};

window.forgotPassword = async function () {
    try {
        const response = await fetch('/api/card');
        const data = await response.json();
        const key = prompt("Digite sua Chave Master:");
        if (key === data.securityKey) {
            const n = prompt("Nova senha:");
            if (n) {
                data.adminPassword = n;
                await fetch('/api/card', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                alert("Senha alterada!");
            }
        }
    } catch (e) { }
};

window.uploadFile = async function (input, targetId) {
    const file = input.files[0];
    if (!file) return;
    const status = document.getElementById('status-' + targetId);
    if (status) {
        status.style.display = 'inline-block';
        status.style.color = '#ff9b50';
        status.innerText = "⏳ Enviando...";
    }
    try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Falha no upload local.');

        const { url } = await response.json();
        document.getElementById(targetId).value = url;
        if (status) {
            status.style.color = '#10b981';
            status.innerText = "✅ Pronto!";
            setTimeout(() => { status.style.display = 'none'; }, 3000);
        }
    } catch (e) { 
        if (status) {
            status.style.color = '#ef4444';
            status.innerText = "❌ Erro no upload";
        }
        console.error(e); 
    }
};
