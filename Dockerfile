FROM node:20-bookworm

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Etc/UTC
ENV DISPLAY=:99

# deps system + novnc stack
RUN apt-get update && apt-get install -y --no-install-recommends \
    xvfb x11vnc novnc websockify \
    ca-certificates curl git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# install node deps first (better cache)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

# install playwright browser + deps (chromium)
RUN npx playwright install --with-deps chromium

# copy source
COPY . .

# start script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Render provides PORT env; default is OK too
EXPOSE 10000

CMD ["/app/start.sh"]
