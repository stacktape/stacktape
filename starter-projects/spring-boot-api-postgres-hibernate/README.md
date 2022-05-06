## Stacktape project Spring Boot API with Postgres

To learn more about this project, refer to [quickstart tutorial docs](https://docs.stacktape.com/getting-started/quickstart-tutorials/spring-boot-api-postgres-hibernate/)

### Prerequisites

- Java installed.
- Docker. To install Docker on your system, you can follow [this guide](https://docs.docker.com/get-docker/).

### Deploy

```
stacktape deploy --region <<your-region>> --stage <<your-stage>>
```

### After deploy

After the deployment is finished, Stacktape will print relevant information about the deployed stack to the console,
including URLs of the deployed resources, links to logs, links to monitoring dashboard, etc.

1. Upload the pictures in `pictures/test-pictures.zip` to the `inputBucket`. You can upload it directly in the AWS console (AWS console link will be printed to the console after deployment.)
2. Wait for the image classification batch job to finish processing.
3. Go to the `outputBucket` to see the classification results.
