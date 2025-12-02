# Example

The following example shows a Stacktape template that includes a _Cloudformation_ SNS topic. The infrastructure includes:

*   **MySnsTopic**: An SNS topic that acts as a communicator between functions (a _Cloudformation_ resource).
*   **processData**: A function that processes data. If it fails, a message is sent to `MySnsTopic`.
*   **analyzeError**: A function that is invoked when `MySnsTopic` receives a failure message from `processData`.
*   **slackNotify**: A function that is invoked when `MySnsTopic` receives a failure message from `processData` and sends a notification to Slack.

```yaml
# {start-highlight}
cloudformationResources:
  MySnsTopic:
    Type: AWS::SNS::Topic
# {stop-highlight}

resources:
  processData:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/process.ts
      # {start-highlight}
      destinations:
        onFailure: $CfResourceParam('MySnsTopic', 'Arn')
      # {stop-highlight}

  analyzeError:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/analysis.ts
      # {start-highlight}
      events:
        - type: sns
          properties:
            topicArn: $CfResourceParam('MySnsTopic', 'Arn')
      # {stop-highlight}

  slackNotify:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/notify.ts
      # {start-highlight}
      events:
        - type: sns
          properties:
            topicArn: $CfResourceParam('MySnsTopic', 'Arn')
      # {stop-highlight}
```