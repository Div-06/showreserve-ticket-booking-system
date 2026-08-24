FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json tsconfig*.json ./
COPY prisma ./prisma/

RUN npm install

COPY src ./src/
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma/
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["sh", "-c", "npx prisma db push && node dist/main"]
