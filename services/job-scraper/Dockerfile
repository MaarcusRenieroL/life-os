# Built from the repo root: docker build -f services/job-scraper/Dockerfile .
FROM node:22-slim

WORKDIR /app

COPY services/job-scraper/package.json ./
# No lockfile yet; keep the install lenient and skip the optional Playwright
# browser download unless the image is rebuilt with USE_PLAYWRIGHT tooling.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install --omit=dev --no-audit --no-fund

COPY services/job-scraper/src ./src

ENV PORT=8010
EXPOSE 8010
CMD ["node", "src/server.js"]
