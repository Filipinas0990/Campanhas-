FROM node:20.9.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install && \
    apk add --no-cache \
        tzdata

COPY . .

RUN npm run build


CMD ["node", "./build/server.js"]
