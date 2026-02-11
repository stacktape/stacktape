- Pub/sub notification fan-out using [SNS topics](https://docs.stacktape.com/resources/sns-topics/).
- Publish a notification and multiple [Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/)
  subscribers process it independently — one logs it, another stores it in
  [DynamoDB](https://docs.stacktape.com/resources/dynamo-db-tables/).
- Demonstrates the fan-out pattern for decoupled event processing.
