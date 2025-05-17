FROM node:18-alpine

ARG MONGODB_URI
ENV MONGODB_URI=${MONGODB_URI}

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"] 