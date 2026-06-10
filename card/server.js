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

