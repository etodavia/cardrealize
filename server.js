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

// Handle SPA routing: send all other requests to index.html
app.get('*path', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

