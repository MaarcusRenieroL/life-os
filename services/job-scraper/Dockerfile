FROM mcr.microsoft.com/playwright:v1.62.1-jammy

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 8007

# xvfb-run's readiness handshake relies on trap-interrupts-wait behavior
# that dash (this image's /bin/sh) doesn't honor the way bash does, so it
# hangs forever. Start Xvfb ourselves instead and give it a moment to come
# up before launching the app against that display.
CMD Xvfb :99 -screen 0 1280x1024x24 -nolisten tcp & sleep 2 && DISPLAY=:99 npm start
