# Retry example

This example shows a state machine that ties together a batch job and a function. The state machine is configured to retry only the upload step if it fails, since regenerating the report would be costly and unnecessary.

-   **`generateReport`**: A batch job that generates a report.
-   **`uploadReport`**: A function that uploads the report.
-   **`reportStateMachine`**: The state machine that orchestrates the workflow.

```yaml
resources:
  uploadReport:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'upload-report.ts'

  generateReport:
    type: 'batch-job'
    properties:
      container:
        packaging:
          type: stacktape-image-buildpack
          properties:
            entryfilePath: generate-report.ts
      resources:
        cpu: 2
        memory: 7800

  reportStateMachine:
    type: 'state-machine'
    properties:
      definition:
        StartAt: 'generate'
        States:
          generate:
            Type: Task
            Resource: 'arn:aws:states:::batch:submitJob.sync'
            Parameters:
              JobDefinition: $ResourceParam('generateReport', 'jobDefinitionArn')
              JobName: report-job
              JobQueue: $Param('SHARED_GLOBAL', 'BatchOnDemandJobQueue::Arn')
            Next: upload
          upload:
            Type: Task
            Resource: $Param('uploadReport', 'LambdaFunction::Arn')
            Next: succeed
            # {start-highlight}
            Retry:
              - ErrorEquals:
                  - 'State.ALL'
                IntervalSeconds: 10
            # {stop-highlight}
          succeed:
            Type: Succeed
```