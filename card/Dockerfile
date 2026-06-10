# Usa uma imagem oficial do Node.js
FROM node:20-slim

# Instala dependências nativas para o sqlite3 (se necessário)
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

# Cria o diretório de trabalho
WORKDIR /app

# Copia os arquivos de dependências
COPY package*.json ./

# Instala as dependências (incluindo devDependencies para o build do Vite)
RUN npm install

# Copia o restante dos arquivos do projeto
COPY . .

# Faz o build do frontend (Vite)
RUN npm run build

# Expõe a porta que o server.js usa
EXPOSE 3000

# Define a variável de ambiente para produção
ENV NODE_ENV=production
ENV PORT=3000


# Comando para iniciar a aplicação de forma direta
CMD ["node", "server.js"]

