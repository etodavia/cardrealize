import express from 'express';
import sqlite3 from 'sqlite3';
import mysql from 'mysql2/promise';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

dotenv.config();

const app = express();

// RASTREADOR DE ACESSOS (Para Debug)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

app.use(cors({ origin: '*', methods: ['GET', 'POST'] }));
app.use(express.json());


const PORT = process.env.PORT || 3000;

const DB_FILE = process.env.DB_FILE || 'database.sqlite';
const DATA_FILE = path.join(process.cwd(), 'data.json');
const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'));

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function safeFileName(name) {
    const parsed = path.parse(name);
    const base = parsed.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'arquivo';
    const ext = parsed.ext.replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
    return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${base}${ext}`;
}

function repairText(value) {
    if (typeof value !== 'string') return value;

    return value
        .replaceAll('Galeria, Catalogos e Videos', 'Galeria, Catálogos e Vídeos')
        .replaceAll('Sua opiniao e importante para nos!', 'Sua opinião é importante para nós!')
        .replaceAll('Sua opini?o ? importante para n?s!', 'Sua opinião é importante para nós!')
        .replaceAll('sua opini?o ? importante para n?s!', 'Sua opinião é importante para nós!')
        .replaceAll('sua opinião é importante para nós!', 'Sua opinião é importante para nós!')
        .replaceAll('Benhur Ara�jo', 'Benhur Araújo')
        .replaceAll('REUNI�O', 'REUNIÃO')
        .replaceAll('mobili�rio', 'mobiliário')
        .replaceAll('Mobili�rio', 'Mobiliário')
        .replaceAll('solu��es', 'soluções')
        .replaceAll('V�deo', 'Vídeo');
}

function repairCardData(value) {
    if (Array.isArray(value)) return value.map(repairCardData);
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, item]) => [key, repairCardData(item)])
        );
    }
    return repairText(value);
}

const upload = multer({
    storage: multer.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => cb(null, safeFileName(file.originalname))
    }),
    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

let useSQLite = false;
let dbSQLite = null;
let dbMaria = null;

const DB_TYPE = (process.env.DB_TYPE || '').toLowerCase();
const mariaConfig = {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    charset: 'utf8mb4'
};

function shouldUseMariaDB() {
    return DB_TYPE === 'mariadb' || Boolean(mariaConfig.host && mariaConfig.user && mariaConfig.database);
}

async function connectMariaDB() {
    if (!shouldUseMariaDB()) return false;

    try {
        dbMaria = mysql.createPool(mariaConfig);
        await dbMaria.query(`
            CREATE TABLE IF NOT EXISTS cards (
                id VARCHAR(50) PRIMARY KEY,
                data LONGTEXT NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);
        console.log('✅ Conectado com sucesso ao MariaDB!');
        return true;
    } catch (error) {
        console.warn('⚠️ MariaDB não disponível:', error.message);
        dbMaria = null;
        return false;
    }
}

function connectSQLite() {
    return new Promise((resolve) => {
        dbSQLite = new sqlite3.Database(DB_FILE, (err) => {
            if (err) {
                console.warn('⚠️ SQLite não disponível:', err.message);
                useSQLite = false;
                resolve();
            } else {
                console.log('✅ Conectado com sucesso ao SQLite!');
                useSQLite = true;
                resolve();
            }
        });
    });
}

await connectSQLite();
await connectMariaDB();

async function getCardDataInternal() {
    try {
        if (dbMaria) {
            const [rows] = await dbMaria.execute('SELECT data FROM cards WHERE id = ?', ['main']);
            if (rows[0]) return repairCardData(JSON.parse(rows[0].data));
        }

        if (useSQLite) {
            const row = await new Promise((resolve, reject) => {
                dbSQLite.get('SELECT data FROM cards WHERE id = ?', ['main'], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (row) return repairCardData(JSON.parse(row.data));
        }

        if (fs.existsSync(DATA_FILE)) {
            const dataJSON = fs.readFileSync(DATA_FILE, 'utf-8');
            return repairCardData(JSON.parse(dataJSON));
        }
    } catch (error) {
        console.error('Erro ao ler dados do card:', error);
        throw error;
    }

    return null;
}

async function saveCardDataInternal(data) {
    const payload = JSON.stringify(data);

    if (dbMaria) {
        await dbMaria.execute(
            'INSERT INTO cards (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data)',
            ['main', payload]
        );
        return;
    }

    if (useSQLite) {
        await new Promise((resolve, reject) => {
            dbSQLite.run(
                'INSERT INTO cards (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = ?',
                ['main', payload, payload],
                (err) => {
                    if (err) reject(err);
                    else resolve();
                }
            );
        });
        return;
    }

    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Serve static files from the Vite build directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));
app.use('/uploads', express.static(UPLOAD_DIR));

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    res.json({
        url: `/uploads/${req.file.filename}`,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size
    });
});

app.get('/api/card', async (req, res) => {
    try {
        const data = await getCardDataInternal();
        if (data) return res.json(data);
        res.status(404).json({ message: 'Dados nao encontrados' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/card', async (req, res) => {
    try {
        const data = req.body;
        await saveCardDataInternal(data);
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Serving the main page with dynamic SEO injection (SSR Lite)
app.get('/', async (req, res) => {
    try {
        let html;
        const distPath = path.join(__dirname, 'dist', 'index.html');
        const rootPath = path.join(__dirname, 'index.html');

        if (fs.existsSync(distPath)) {
            html = fs.readFileSync(distPath, 'utf8');
        } else if (fs.existsSync(rootPath)) {
            html = fs.readFileSync(rootPath, 'utf8');
        } else {
            return res.status(404).send('index.html not found');
        }

        const data = await getCardDataInternal();
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}`;
        
        if (data && data.seo) {
            console.log(`[SSR] Injetando SEO para: ${data.seo.title}`);
            const title = data.seo.title || 'Benaso Soluções - Benhur Araújo';
            const desc = data.seo.description || 'Clique no link abaixo para abrir meu cartão digital.';
            let imageUrl = data.seo.image || '';
            let logo = (data.header && data.header.logoUrl) ? data.header.logoUrl : '';

            // Ensure URLs are absolute for Facebook/WhatsApp
            if (imageUrl && imageUrl.startsWith('/')) imageUrl = baseUrl + imageUrl;
            if (logo && logo.startsWith('/')) logo = baseUrl + logo;
            
            // 1. Remove ANY existing SEO tags to start clean
            html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
            html = html.replace(/<meta[^>]*name=["']description["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:title["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:description["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:image["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:image:secure_url["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:type["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*name=["']twitter:card["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*name=["']twitter:image["'][^>]*>/gi, '');

            // 2. Prepare new SEO tags
            let seoTags = `
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${baseUrl}${req.url}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${desc}" />
`;
            
            // Final fallback image if everything is empty
            let finalImage = imageUrl || logo;

            if (finalImage) {
                // Add a cache-buster timestamp to force update
                const cacheBuster = `?t=${Date.now()}`;
                const finalImageWithBuster = finalImage.includes('?') ? (finalImage + '&' + cacheBuster.substring(1)) : (finalImage + cacheBuster);

                seoTags += `    <meta property="og:image" content="${finalImageWithBuster}" />\n`;
                seoTags += `    <meta property="og:image:secure_url" content="${finalImageWithBuster}" />\n`;
                seoTags += `    <meta property="og:image:width" content="1200" />\n`;
                seoTags += `    <meta property="og:image:height" content="630" />\n`;
                seoTags += `    <meta name="twitter:image" content="${finalImageWithBuster}" />\n`;
            }

            if (logo) {
                seoTags += `    <link rel="icon" type="image/png" href="${logo}" />\n`;
            }

            // 3. Inject right after <head>
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>\n${seoTags}`);
            }
        }

        res.send(html);
    } catch (error) {
        console.error('SSR Error:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Handle SPA routing: send all other requests to index.html
app.get('*all', (req, res) => {
    // If it's a request for a static file that wasn't found by express.static, 
    // or a sub-route, send index.html
    const distPath = path.join(__dirname, 'dist', 'index.html');
    if (fs.existsSync(distPath)) {
        res.sendFile(distPath);
    } else {
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});


try {
    const server = app.listen(PORT, () => {
        console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Erro: A porta ${PORT} já está sendo usada por outro programa.`);
        } else {
            console.error('❌ Erro no servidor:', err);
        }
        process.exit(1);
    });
} catch (e) {
    console.error('❌ Não foi possível iniciar o servidor:', e);
    process.exit(1);
}
