FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --omit=dev

# Copy application source code
COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
