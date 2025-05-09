# Use Node.js LTS as the base image
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile || yarn install

# Copy the rest of the application code
COPY . .

# Build the Next.js app
RUN yarn build

# Use a lightweight web server for production
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["yarn", "start"]
