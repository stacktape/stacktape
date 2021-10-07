## Stacktape project Web Scraper Lambda Puppeteer

### Description

Web link-scraper implemented in typescript using headless chrome (puppeteer).
Runs in a lambda function. Accessed using HTTP API Gateway.

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

- `bucket` - used for both uploading raw videos (`raw-videos` directory) and outputing transcoded videos (`transcoded` directory)
- `batch-job` - transcodes the uploaded video and uploads it to the `transcoded` directory. Batch job is triggered when a video is uploaded to the `raw-videos` directory of the bucket.
- `http-api-gateway` - entrypoint for the frontend lambda function
- `function` - used to serve frontend (server-side rendered React application)
