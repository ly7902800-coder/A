FROM node:20-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends git python3 python3-pip build-essential ca-certificates zip unzip tar && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json tsconfig.json ./
COPY src ./src
RUN npm install && npm run build && npm prune --omit=dev
ENV NODE_ENV=production
ENV PORT=8090
EXPOSE 8090
CMD ["node","dist/index.js"]
