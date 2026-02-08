### 1.1 Astro Web

The `astro-web` resource handles everything automatically:

- **Server-side rendering** runs in AWS Lambda
- **Static assets** are uploaded to S3 and served through CloudFront CDN
- **No configuration needed** beyond specifying the app directory

```yml
resources:
  web:
    type: astro-web
    properties:
      appDirectory: ./
```
