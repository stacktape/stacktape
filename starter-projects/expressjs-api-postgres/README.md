## Stacktape project Express.js API with Postgres

To learn more about this project, refer to [quickstart tutorial docs](https://docs.stacktape.com/getting-started/quickstart-tutorials/expressjs-api-postgres/)

### Prerequisites

- Node.js installed.
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).

Fill in your API keys and organization ID in the `providerConfig.mongoDbAtlas` section of the config.

To get your API keys and organization ID, you can follow [MongoDB Atlas tutorial](https://docs.atlas.mongodb.com/configure-api-access/#std-label-atlas-prog-api-key).

To securely store your MongoDB Atlas credentials, you can use secrets. To create a new secret, refer to [secret-create command docs](https://docs.stacktape.com/cli/commands/secret-create).

### Deploy

```
stacktape deploy --region <<your-region>> --stage <<your-stage>>
```

### After deploy

After the deployment is finished, Stacktape will print relevant information about the deployed stack to the console,
including URLs of the deployed resources, links to logs, links to monitoring dashboard, etc.
