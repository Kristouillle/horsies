# Build stage
FROM node:18-slim

WORKDIR /usr/src/app

# Copy package files first to leverage Docker cache
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build the application
RUN npm run buildweb

# Keep only the built file and clean up
RUN cp dist/final.js . && \
    rm -rf dist && \
    find . -mindepth 1 ! -name 'final.js' -delete

EXPOSE 80
CMD ["node","final.js"]