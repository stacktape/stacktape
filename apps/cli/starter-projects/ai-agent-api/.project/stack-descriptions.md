### 1.1 Agent Function

The AI agent runs in a Lambda function with
[Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) and response streaming enabled.
This allows token-by-token streaming directly to the browser without buffering.

- **Memory** is set to 1024 MB for AI inference performance.
- **Timeout** is set to 120 seconds to allow for multi-step tool calling.
- **Response streaming** is enabled via `url.responseStreamEnabled: true`.
- **IAM permissions** allow invoking Amazon Bedrock models (including streaming).
- The AI model is configurable via the `AI_MODEL` secret/environment variable.
- **connectTo** automatically injects DynamoDB table credentials into the function environment.

```yml
resources:
  agent:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 1024
      timeout: 120
      connectTo:
        - conversations
      url:
        enabled: true
        responseStreamEnabled: true
      iamRoleStatements:
        - Resource:
            - "*"
          Effect: "Allow"
          Action:
            - "bedrock:InvokeModel"
            - "bedrock:InvokeModelWithResponseStream"
```

### 1.2 Conversations Table

A [DynamoDB table](https://docs.stacktape.com/resources/dynamo-db-tables/) stores conversation history so the agent
remembers context across requests.

- **Partition key** (`conversationId`) groups messages by conversation.
- **Sort key** (`timestamp`) keeps messages in chronological order.
- The function accesses the table via `connectTo`, which automatically grants permissions and injects the table name as
  an environment variable.

```yml
resources:
  conversations:
    type: dynamo-db-table
    properties:
      primaryKey:
        partitionKey:
          name: conversationId
          type: string
        sortKey:
          name: timestamp
          type: string
```
