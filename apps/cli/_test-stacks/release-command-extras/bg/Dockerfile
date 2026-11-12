FROM public.ecr.aws/docker/library/node:22-alpine
WORKDIR /app
COPY . .
ENV PORT=3000
ENTRYPOINT ["node", "server.mjs"]
