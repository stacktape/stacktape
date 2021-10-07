## Stacktape project Website Nextjs Ssr

### Description

Server-side rendered website implemented in Typescript using Next.js framework.

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

Visit the URL of the website.

### Deployed resources

- `container-workload` - runs the Next.js server
- `http-api-gateway with CDN attached` - routes requests to the container workload
