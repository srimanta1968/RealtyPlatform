FROM node:20-alpine AS deps
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY services/user-service/package.json services/user-service/package.json
COPY packages packages
RUN corepack enable && pnpm install --frozen-lockfile --filter @kiana/user-service...

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo /repo
COPY services/user-service services/user-service
RUN corepack enable && pnpm --filter @kiana/user-service build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/services/user-service/dist ./dist
COPY --from=build /repo/services/user-service/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
USER node
EXPOSE 4010
CMD ["node", "dist/index.js"]
