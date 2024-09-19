# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to install dependencies first (leveraging Docker cache)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the app's code to the working directory
COPY . .

# Expose a default command for the CLI
ENTRYPOINT ["./index.js"]
