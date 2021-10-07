## Stacktape project Expressjs Api Mongodb Mongoose

### Description

Simple HTTP CRUD API implemented in typescript using Express.js.
API runs in a container workload.
The data is stored in a MongoDB Atlas cluster and accessed using mongoose ORM.

### Before deploy

Make sure you have all of the [stacktape's preresisites](https://docs.stacktape.com/getting-started/1-install).

Fill in your API keys and orgnaization ID in the `providerConfiguration.mongoDbAtlas` section of the config.

To get your API keys and organization ID, you can follow [MongoDB Atlas tutorial](https://docs.atlas.mongodb.com/configure-api-access/#std-label-atlas-prog-api-key).

To securely store your MongoDB Atlas credentials, you can use secrets. To create a new secret, refer to [secret-create command docs](https://docs.stacktape.com/cli/commands/secret-create).

### Deploy

```
stacktape deploy --region your-region --stage your-stage
```

### After deploy

After the deployment is finished, stacktape will print relevant information about the deployed stack to the console,
including URLs of the deployed resources, links to logs, links to monitoring dashboard, etc.

You can also print this information using the following command:

```
stacktape describe-stack
```

You can test the deployed API using a provided script (located in `scripts/test-api.ts`). You can use stacktape to execute the script:

```
stacktape exec-script --sourcePath scripts/test-api.ts --env API_URL=YOUR_API_URL
```

Replace `YOUR_API_URL` with the URL of the deployed API Gateway.

### Deployed resources

- `http-api-gateway` - routes requests to the container workload
- `container-workload` - runs the API
- `mongo-db-atlas-cluster` - stores the data
