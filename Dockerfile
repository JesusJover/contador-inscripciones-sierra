# Usa la imagen base de Node.js
FROM node:18-slim

# Instala las dependencias necesarias para Puppeteer
RUN apt-get update && apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libnss3 \
    libxss1 \
    libgl1 \
    libxkbcommon0 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Establece el directorio de trabajo
WORKDIR /app

# Copia el package.json e instala las dependencias
COPY package.json .
RUN npm install

# Copia el código de la aplicación
COPY . .

# Expone el puerto
EXPOSE 4000

# Ejecuta la aplicación
CMD ["node", "index.js"]
