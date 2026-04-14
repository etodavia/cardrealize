import express from 'express';
import sqlite3 from 'sqlite3';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

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

let useSQLite = false;
let dbSQLite = null;

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

// Serve static files from the Vite build directory
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, 'dist')));

app.get('/api/card', async (req, res) => {
    try {
        if (useSQLite) {
            const row = await new Promise((resolve, reject) => {
                dbSQLite.get('SELECT data FROM cards WHERE id = ?', ['main'], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (row) return res.json(JSON.parse(row.data));
        }
        
        if (fs.existsSync(DATA_FILE)) {
            const data = fs.readFileSync(DATA_FILE, 'utf-8');
            return res.json(JSON.parse(data));
        }
        res.status(404).json({ message: 'Dados não encontrados' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/card', async (req, res) => {
    try {
        const data = req.body;
        if (useSQLite) {
            await new Promise((resolve, reject) => {
                dbSQLite.run(
                    'INSERT INTO cards (id, data) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET data = ?',
                    ['main', JSON.stringify(data), JSON.stringify(data)],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        }
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Helper function to get data for SSR
async function getCardDataInternal() {
    try {
        if (useSQLite) {
            const row = await new Promise((resolve, reject) => {
                dbSQLite.get('SELECT data FROM cards WHERE id = ?', ['main'], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            if (row) return JSON.parse(row.data);
        }
        if (fs.existsSync(DATA_FILE)) {
            const dataJSON = fs.readFileSync(DATA_FILE, 'utf-8');
            return JSON.parse(dataJSON);
        }
    } catch (e) {
        console.error("Erro ao ler dados para SEO:", e);
    }
    return null;
}

// Special route for root to inject SEO tags (SSR Lite)
app.get('/', async (req, res) => {
    try {
        const data = await getCardDataInternal();
        let htmlPath = path.join(__dirname, 'dist', 'index.html');
        
        // Fallback for local development if dist doesn't exist
        if (!fs.existsSync(htmlPath)) {
            htmlPath = path.join(__dirname, 'index.html');
        }

        if (!fs.existsSync(htmlPath)) {
            return res.status(404).send("Index não encontrado");
        }

        let html = fs.readFileSync(htmlPath, 'utf8');

        if (data && data.seo) {
            const title = data.seo.title || 'Cartão Digital';
            const desc = data.seo.description || 'Conheça nossos serviços';
            const imageUrl = data.seo.image || '';
            const logo = (data.header && data.header.logoUrl) ? data.header.logoUrl : '';
            
            // 1. Remove existing title and meta tags to avoid duplication
            html = html.replace(/<title[^>]*>[\s\S]*?<\/title>/gi, '');
            html = html.replace(/<meta[^>]*name=["']description["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:title["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:description["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:image["'][^>]*>/gi, '');
            html = html.replace(/<meta[^>]*property=["']og:type["'][^>]*>/gi, '');

            // 2. Prepare new SEO tags
            let seoTags = `
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${desc}" />
    <meta property="og:type" content="website" />
`;
            if (imageUrl) {
                seoTags += `    <meta property="og:image" content="${imageUrl}" />\n`;
                seoTags += `    <meta name="twitter:image" content="${imageUrl}" />\n`;
            }
            if (logo) {
                seoTags += `    <link rel="icon" type="image/png" href="${logo}" />\n`;
                // If no SEO image, use logo as fallback for OG
                if (!imageUrl) {
                    seoTags += `    <meta property="og:image" content="${logo}" />\n`;
                }
            }

            // 3. Inject right after <head> or at the beginning of Head
            if (html.includes('<head>')) {
                html = html.replace('<head>', `<head>\n${seoTags}`);
            }
        }

        res.send(html);
    } catch (e) {
        console.error("Erro SSR:", e);
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

