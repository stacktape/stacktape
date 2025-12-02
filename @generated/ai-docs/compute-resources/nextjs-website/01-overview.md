# Overview

The `nextjs-website` resource is designed to deploy [Next.js](https://nextjs.org/) applications to AWS. It leverages _serverless_ technologies like AWS Lambda and _Lambda@Edge_ to run your application efficiently. Stacktape automatically provisions and configures all the necessary AWS resources, so you can focus on writing your application code.

```yaml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
```

> Basic use of `nextjs-web` resource