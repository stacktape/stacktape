FROM public.ecr.aws/docker/library/node:22-alpine
CMD ["node", "-e", "require(\"http\").createServer((_, r) => r.end(\"ok\")).listen(8080)"]
