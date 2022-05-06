## Stacktape project Kafka stream processing

To learn more about this project, refer to [quickstart tutorial docs](https://docs.stacktape.com/getting-started/quickstart-tutorials/kafka-stream-processing/)

### Prerequisites

- Node.js installed.

### Deploy

```
stacktape deploy --region <<your-region>> --stage <<your-stage>>
```

### After deploy

After the deployment is finished, Stacktape will print relevant information about the deployed stack to the console,
including URLs of the deployed resources, links to logs, links to monitoring dashboard, etc.

1. Make multiple requests to https://YOUR_MAIN_GATEWAY_URL/produce/YOUR_MESSAGE
2. Go to kafkaConsumer->logs (AWS link will be printed to the console) and see how the messages are handled in batches.
