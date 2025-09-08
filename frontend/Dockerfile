FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Expose the port Vite uses
EXPOSE 5173

# Set host to 0.0.0.0 to allow external access
ENV HOST=0.0.0.0

# Default value for VITE_API_URL (can be overridden at runtime)
ENV VITE_API_URL=http://localhost:8001/

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]