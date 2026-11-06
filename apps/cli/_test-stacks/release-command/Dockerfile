# The fixed entry point is deliberate: a release command must replace it, or the task would start the server and never end.
FROM public.ecr.aws/docker/library/node:22-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY . .
ENV PORT=3000
ENTRYPOINT ["node", "server.mjs"]
