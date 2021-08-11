## Stacktape project typescript-MERN-stack-container

### Description

MERN (MongoDB, Express, React, Node) CRUD API. Runs in a container. Accessed using HTTP Api Gateway. Data is stored in MongoDB Atlas and accessed using mongoose ORM.

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

Fill in api keys and orgnaization id in section `providerConfiguration.mongoDbAtlas` with your credentials.

You can get your Atlas Mongo api keys for your account and organization by following [this tutorial](https://docs.atlas.mongodb.com/configure-api-access/#std-label-atlas-prog-api-key).
We advise that you store your api keys and other credentials as secrets (see [create secret command](https://docs.stacktape.com/cli/commands/secret-create))

### After deploy

Visit CDN url of the bucket to see the application
