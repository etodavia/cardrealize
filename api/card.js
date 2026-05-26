import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(__dirname, '..', 'data.json');

function readCardData() {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
}

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({
            error: 'Método não permitido no deploy estático da Vercel.'
        });
    }

    try {
        return res.status(200).json(readCardData());
    } catch (error) {
        return res.status(500).json({
            error: 'Não foi possível carregar os dados do card.',
            detail: error.message
        });
    }
}
