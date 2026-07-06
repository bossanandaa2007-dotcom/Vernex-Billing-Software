# Use Node.js as base image
FROM node:lts-alpine

# Set working directory
WORKDIR /app

# Copy package.json dan package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all code
COPY . .

# Copy .env file
COPY .env .env

# Build the application
RUN npm run build

# Set environment variables 
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Run app
CMD ["npm", "start"]
