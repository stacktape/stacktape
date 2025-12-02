# Publishing messages

You can use the [AWS SDK](https://aws.amazon.com/developer/tools/#SDKs) to publish messages to a topic.

```javascript
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({});

snsClient.send(
  new PublishCommand({
    Message: "Hello from the other side.",
    TopicArn: process.env.STP_MY_TOPIC_ARN,
  })
);
```