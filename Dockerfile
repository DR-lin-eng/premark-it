FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.mjs ./
COPY lib ./lib
COPY test ./test
COPY LICENSE ./

CMD ["npm", "test"]
