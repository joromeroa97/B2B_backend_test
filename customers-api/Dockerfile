# customers-api/Dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar package.json y package-lock.json (si existe)
COPY package*.json ./

# Instalar dependencias (prod)
RUN npm install --omit=dev

# Copiar el código
COPY . .

# Variables de entorno por defecto (se pueden sobrescribir en docker-compose)
ENV NODE_ENV=production
ENV PORT=3001

# Exponer puerto interno
EXPOSE 3001

# Comando por defecto
CMD ["npm", "start"]
