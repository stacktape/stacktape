## Stacktape project Website Static Html

### Description

Static website with plain HTML. Hosted in a bucket behind a CDN.

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

- `bucket with CDN attached` - used to host your static content. CDN is used to improve performance across multiple geographical locations.
