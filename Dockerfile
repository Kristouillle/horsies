# Build stage
FROM node:18-slim

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install
RUN npm run buildweb

COPY dist/final.js .

EXPOSE 80
CMD ["node","final.js"]