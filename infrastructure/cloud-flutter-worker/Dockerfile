FROM ghcr.io/cirruslabs/flutter:stable
RUN apt-get update && apt-get install -y nodejs npm git python3 chromium && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 8090
CMD ["node","server.js"]