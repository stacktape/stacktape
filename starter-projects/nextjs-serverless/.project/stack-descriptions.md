### 1.1 Next.js Web

Application runs in `nextjs-web` resource which requires zero configuration out of the box.

The `nextjs-web` resource uses [OpenNEXT](https://open-next.js.org/) adapter to run the Next app in AWS Lambda Function.

<br/>

Optionally you can rn your NextJS app using Lambda@Edge. Refer to
[resource docs](https://docs.stacktape.com/compute-resources/next-website/) for more information.

```yml
resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./
```
