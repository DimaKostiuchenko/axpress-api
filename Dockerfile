FROM node:20-alpine

# Create a non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy package files and install dependencies
# Using npm install for development (can be changed to npm ci --only=production for production)
COPY package*.json ./
RUN npm install && \
    npm cache clean --force

# Copy application files
COPY . .

# Set proper ownership and permissions
RUN chown -R nodejs:nodejs /app && \
    chmod -R 755 /app

# Switch to non-root user
USER nodejs

EXPOSE 3000

CMD ["npm", "run", "dev"]
