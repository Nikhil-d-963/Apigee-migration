# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Copy the rest of your application code
COPY . .

# Make the CLI tool executable
RUN npm link

# Define the entry point for the container
ENTRYPOINT ["apigee-migration"]

# Define default arguments (if needed, otherwise this can be omitted)
# CMD ["--help"]
