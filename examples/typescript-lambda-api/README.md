## Stacktape project typescript-lambda-api

### Description

HTTP Api implemented in Typescript. Runs in a lambda functions. Accessed using HTTP Api Gateway. Data is stored in a relational-database and accessed using Sequelize ORM.

### Deployed resources

- `http-api-gateway` forwards HTTP requests to the lambda function
- `lambda function` processes the request and returns "Hello world" back to the HTTP Api Gateway.

### Before deploy

#### 1. Install all Stacktape's prerequisities

To learn about Stacktape's prerequisities, visit [Stacktape docs](https://docs.stacktape.com/getting-started/1-install)

#### 2. Install project's dependencies locally

```bash
yarn install or npm install or pnpm install
```

### After deploy

Visit front-end on url of http-api-gateway. After deployment the url of the gateway should be visible in your terminal among stack outputs.
