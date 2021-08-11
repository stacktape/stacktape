## Stacktape project typescript-nest-js-api-container

### Description

Simple API implemented in typescript using NestJS. Runs in a container. Accessed using HTTP Api Gateway.

### Deployed resources

- `mongo-db-atlas-cluster` - database for storing application data
- `container-workload` - back-end container running express.js in node runtime
- `http-api-gateway` - entrypoint for routing requests to backend container
- `bucket` - contains front-end built with react and served from bucket using CDN

The code of the application was originally built by [Nur Islam](https://github.com/nurislam03) as a part of his [Mern stack tutorial](https://blog.logrocket.com/mern-stack-tutorial/).

### Before deploy

#### 1. Install all Stacktape's prerequisities

To learn about Stacktape's prerequisities, visit [Stacktape docs](https://docs.stacktape.com/getting-started/1-install)

#### 2. Install project's dependencies locally

```bash
yarn install or npm install or pnpm install
```

### After deploy

Visit CDN url of the bucket to see the application
