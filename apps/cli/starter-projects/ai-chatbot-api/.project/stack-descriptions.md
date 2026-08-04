### 1.1 Chat Function

The AI chatbot runs in a Lambda function with
[Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) and response streaming enabled.
This allows token-by-token streaming directly to the browser without buffering.

- **Memory** is set to 1024 MB for AI inference performance.
- **Timeout** is set to 60 seconds to allow for longer AI responses.
- **Response streaming** is enabled via `url.responseStreamEnabled: true`.
- **IAM permissions** allow invoking Amazon Bedrock models (including streaming).
- The AI model is configurable via the `AI_MODEL` secret/environment variable.

```yml
resources:
  chat:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/index.ts
      memory: 1024
      timeout: 60
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
