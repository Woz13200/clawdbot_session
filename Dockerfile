FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN chmod +x /app/start.sh

ENV NODE_ENV=production
EXPOSE 10000

CMD ["/app/start.sh"]
