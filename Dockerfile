FROM node:20-bullseye

WORKDIR /app

# Build deps for llama.cpp
RUN apt-get update && apt-get install -y --no-install-recommends \
    git cmake build-essential curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Copy package files first (better cache)
COPY package*.json ./
RUN npm ci --omit=dev

# App sources
COPY . .

# Build llama.cpp
RUN rm -rf /app/llama.cpp \
  && git clone --depth 1 https://github.com/ggml-org/llama.cpp.git /app/llama.cpp \
  && cmake -S /app/llama.cpp -B /app/llama.cpp/build -DCMAKE_BUILD_TYPE=Release \
  && cmake --build /app/llama.cpp/build -j 2

ENV PORT=10000
EXPOSE 10000

CMD ["bash", "./start.sh"]
