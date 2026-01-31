FROM mcr.microsoft.com/playwright:v1.48.2-jammy
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ENV PORT=10000
EXPOSE 10000
CMD ["node","src/server.js"]
