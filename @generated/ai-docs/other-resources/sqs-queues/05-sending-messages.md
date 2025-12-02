# Sending messages

You can use the [AWS SDK](https://aws.amazon.com/developer/tools/#SDKs) to send messages to a queue.

```typescript
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({});

sqsClient.send(
  new SendMessageCommand({
    MessageBody: "Hello from the other side",
    QueueUrl: process.env.STP_MY_QUEUE_URL,
  })
);
```