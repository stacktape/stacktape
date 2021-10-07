## Stacktape project Lambda Hello World

### Description

Simple "Hello world" lambda function connected to HTTP Api Gateway.

### Before deploy

Make sure you have all of the [stacktape's preresisites](https://docs.stacktape.com/getting-started/1-install).

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

### Deployed resources

- `http-api-gateway` - routes HTTP requests to the lambda function
- `lambda function` - processes the request and returns "Hello world"
