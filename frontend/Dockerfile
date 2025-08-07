# Use the official Node.js 14 image as the base image
FROM node:14

# Set the working directory in the container
WORKDIR /app
# Copy package.json and package-lock.json to the working directory
COPY package*.json ./
# Install dependencies
RUN npm install
# Copy the remaining application code to the working directory
COPY . .
# Expose port 3000
EXPOSE 3000
# Define the command to run the application
CMD ["npm", "run dev"]