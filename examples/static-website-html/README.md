## Stacktape project static-website-html

### Description

Static website with plain HTML. Hosted in bucket with CDN.

### Deployed resources

- `bucket` which is used for both uploading raw videos (`raw-videos` directory) and outputing transcoded videos (`transcoded` directory)

### Before deploy

#### 1. Install all Stacktape's prerequisities

To learn about Stacktape's prerequisities, visit [Stacktape docs](https://docs.stacktape.com/getting-started/1-install)

#### 2. Install project's dependencies locally

```bash
yarn install or npm install or pnpm install
```

### After deploy

Visit front-end on url of http-api-gateway. After deployment the url of the gateway should be visible in your terminal among stack outputs.
