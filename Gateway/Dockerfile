# Etapa 1 – Build
FROM node:20 AS builder
WORKDIR /app

COPY ./gateway/package*.json ./
RUN npm install

COPY ./gateway ./
RUN npm run build

# Etapa 2 – Runtime
FROM node:20-alpine
WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000
CMD ["node", "dist/main"]
