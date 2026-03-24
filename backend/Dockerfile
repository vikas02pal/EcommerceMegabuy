FROM node:18-alpine

WORKDIR /usr/src/app/backend

# Install dependencies for backend
COPY backend/package*.json ./
RUN npm install --production

# Copy whole project so server can serve frontend from parent directory
COPY . .

EXPOSE 5000
CMD ["node", "server.js"]
