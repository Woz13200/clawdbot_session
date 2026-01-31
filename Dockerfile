FROM mcr.microsoft.com/playwright:v1.48.2-jammy

RUN apt-get update && apt-get install -y \
  xvfb fluxbox x11vnc novnc \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ENV DISPLAY=:99
ENV PORT=10000

EXPOSE 10000

CMD ["bash", "start.sh"]
