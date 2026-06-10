import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAoYOszUvv_r-uE7mOMZTVacYDuJAERAOw",
    authDomain: "carddigitalloth-a0e92.firebaseapp.com",
    projectId: "carddigitalloth-a0e92",
    storageBucket: "carddigitalloth-a0e92.firebasestorage.app",
    messagingSenderId: "588513949527",
    appId: "1:588513949527:web:2348b99a4257e89e74f012",
    measurementId: "G-RV0DNCNEN9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const defaultData = {
    header: {
        logoUrl: "", 
        tagline: "LOTH DIGITAL\nMARKETING & ASSESSORIA",
        topQrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://uicard-01.web.app"
    },
    backgrounds: {
        mobileUrl: "",
        tabletUrl: "",
        desktopUrl: ""
    },
    profile: {
        name: "Lorena Dantas",
        title: "marketing & assessoria",
        whatsappNumber: "5500999999999",
        whatsappText: "AGENDE UMA REUNIÃO\n(00) 99999-9999"
    },
    links: [
        { displayText: "www.seuswebsite.com.br", url: "#", iconType: "fas fa-globe", colorClass: "bg-black" },
        { displayText: "@seuperfilnoinstagram", url: "#", iconType: "fab fa-instagram", colorClass: "bg-orange" },
        { displayText: "@seuperfilnofacebook", url: "#", iconType: "fab fa-facebook-f", colorClass: "bg-black" }
    ],
    addressBlock: {
        title: "Entre Aspas",
        lines: "Rua : Beka alameda de s/a 235 - filixa\nCEP 14254785\nCidade - Estado - Brasil\nFrase de Destaque Personalizada"
    },
    reviewBlock: {
        title: "Avalie nosso trabalho",
        subtext: "sua opinião é importante para nós!",
        qrCodeUrl: "https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://g.page/review"
    },
    products: {
        sectionTitle: "Serviços da Agência",
        items: [
            { title: "Serviço 1", imgUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=300" },
            { title: "Serviço 2", imgUrl: "https://images.unsplash.com/photo-1432888498266-38ffec3eaf0a?auto=format&fit=crop&w=300" },
            { title: "Serviço 3", imgUrl: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=300" }
        ]
    },
    seo: {
        title: "Loth Digital - Lorena Dantas",
        description: "Acesse nosso cartão digital e conheça nossos serviços de marketing e assessoria."
    },
    tracking: { fbPixel: "", gtmHead: "", gtmBody: "" },
    footer: {
        text: "App elaborado por Loth Digital\nTodos os direitos reservados @2026"
    },
    adminEmail: "loth.mktdigital@gmail.com",
    adminPassword: "admin"
};

async function init() {
    console.log("Iniciando popularização do banco de dados...");
    try {
        await setDoc(doc(db, "cardData", "main"), defaultData);
        console.log("Sucesso! Banco de dados inicializado com os dados padrão.");
        process.exit(0);
    } catch (error) {
        console.error("Erro ao inicializar:", error);
        process.exit(1);
    }
}

init();
