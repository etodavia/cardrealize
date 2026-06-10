import sqlite3 from 'sqlite3';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const DB_FILE = process.env.DB_FILE || 'database.sqlite';
const DATA_FILE = path.join(process.cwd(), 'data.json');

const db = new sqlite3.Database(DB_FILE, (err) => {
    if (err) {
        console.error('❌ Erro ao abrir SQLite:', err.message);
        process.exit(1);
    }
    console.log('📡 Conectado ao SQLite (Arquivo: ' + DB_FILE + ')');
});

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) console.error('❌ Erro ao criar tabela:', err.message);
        else console.log('✅ Tabela "cards" verificada/criada.');
    });

    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        // Force update: Replace the "main" row with current data.json content
        db.run('INSERT OR REPLACE INTO cards (id, data) VALUES (?, ?)', ['main', data], (err) => {
            if (err) console.error('❌ Erro ao sincronizar dados:', err.message);
            else console.log('☘️ Banco de Dados SQLite sincronizado com o data.json com sucesso!');
        });
    }
});

setTimeout(() => {
    db.close();
    console.log('🏁 Inicialização SQLite concluída.');
}, 2000);
