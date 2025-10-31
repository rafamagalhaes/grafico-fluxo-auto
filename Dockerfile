# Stage 1: Dependências e Build
FROM node:20-alpine AS base

# Instala pnpm
RUN npm install -g pnpm

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos de configuração do pnpm e do projeto
COPY package.json pnpm-lock.yaml ./

# Instala as dependências
FROM base AS deps
RUN pnpm install --frozen-lockfile

# Stage 2: Build da Aplicação
FROM base AS builder
# Copia as dependências instaladas
COPY --from=deps /app/node_modules ./node_modules
# Copia o restante do código
COPY . .

# Gera o build de produção
RUN pnpm run build

# Stage 3: Imagem de Produção
FROM node:20-alpine AS runner
WORKDIR /app

# Define o usuário não-root para segurança
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

# Copia os arquivos de produção do builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Define a porta de execução
ENV PORT 3000
EXPOSE 3000

# Comando de execução
CMD ["node", "server.js"]
