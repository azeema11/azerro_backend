# Build stage
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma/
RUN npm ci --only=production
COPY --from=build /app/dist ./dist

# Generate prisma client for production
RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "run", "start"]
