### 1.1 Nuxt Web

The `nuxt-web` resource handles everything automatically:

- **Server-side rendering** runs in AWS Lambda (using Nitro's aws-lambda preset)
- **Static assets** are uploaded to S3 and served through CloudFront CDN
- **No configuration needed** beyond specifying the app directory

```yml
resources:
  web:
    type: nuxt-web
    properties:
      appDirectory: ./
```
