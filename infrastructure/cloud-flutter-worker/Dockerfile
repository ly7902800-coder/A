FROM ghcr.io/cirruslabs/flutter:stable
RUN apt-get update && apt-get install -y nodejs npm git python3 chromium blender wget unzip libx11-6 libxcursor1 libxinerama1 libxrandr2 libxi6 libgl1 && rm -rf /var/lib/apt/lists/*
RUN wget -q https://godot-releases.nbg1.your-objectstorage.com/4.7.1-stable/Godot_v4.7.1-stable_linux.x86_64.zip -O /tmp/godot.zip && unzip -q /tmp/godot.zip -d /opt/godot && mv /opt/godot/Godot_v4.7.1-stable_linux.x86_64 /usr/local/bin/godot && chmod +x /usr/local/bin/godot && rm -rf /tmp/godot.zip /opt/godot
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY server.js ./
EXPOSE 8090
CMD ["node","server.js"]
