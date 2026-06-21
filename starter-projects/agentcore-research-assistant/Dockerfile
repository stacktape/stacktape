FROM public.ecr.aws/docker/library/node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY src ./src

ENV PORT=8080
EXPOSE 8080

CMD ["node", "src/index.js"]
