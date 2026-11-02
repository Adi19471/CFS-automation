
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV CI=true
ENV TEST_ENV=uat
ENV BROWSERS=chromium
ENV TRACE=retain-on-failure
ENV VIDEO=retain-on-failure

CMD ["npx", "playwright", "test"]
