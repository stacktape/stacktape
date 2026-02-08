### 1.1 Next.js Web

The app runs serverlessly using the `nextjs-web` resource, which requires zero configuration.

Behind the scenes, it creates a Lambda function for server-side rendering, an S3 bucket for static assets, and a
CloudFront CDN for global delivery.

```yml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
```

To connect a database, add a `relational-database` resource and list it in `connectTo`. The connection string is
automatically injected as an environment variable.
