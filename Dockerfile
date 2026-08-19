FROM node:22-bookworm-slim AS build

WORKDIR /app
COPY deployment-source.tar.gz ./
RUN tar -xzf deployment-source.tar.gz && rm deployment-source.tar.gz
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 10000
CMD ["node", "dist/index.js"]
