### 1.1 Hosting Bucket

The hosting bucket stores the built SPA and serves it via CloudFront CDN:

- Built assets are uploaded automatically during deployment.
- CDN cache is invalidated after each deploy to serve the latest version.
- Environment variables can be injected at deploy time without rebuilding the app.

```yml
resources:
  webBucket:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: single-page-app
```

### 1.2 Build Hook

The application is built automatically before each deployment using a
[hook](https://docs.stacktape.com/configuration/hooks/).

```yml
hooks:
  beforeDeploy:
    - scriptName: build
```
