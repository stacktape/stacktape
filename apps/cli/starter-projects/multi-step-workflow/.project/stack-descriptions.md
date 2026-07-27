### 1.1 HTTP API Gateway

API Gateway receives HTTP requests and routes them to the startWorkflow Lambda function.

```yml
resources:
  apiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Step Functions State Machine

The workflow orchestrates three Lambda functions in sequence with branching and error handling:

1. **ValidateInput** - checks that the input data is valid
2. **IsValid** (Choice) - routes valid input to processing, invalid input to failure
3. **ProcessData** - transforms the data (with automatic retries on failure)
4. **GenerateReport** - produces the final output

```yml
workflow:
  type: state-machine
  properties:
    definition:
      StartAt: ValidateInput
      States:
        ValidateInput:
          Type: Task
          Resource: ...
          Next: IsValid
        IsValid:
          Type: Choice
          Choices:
            - Variable: $.valid
              BooleanEquals: true
              Next: ProcessData
          Default: Failed
        ProcessData:
          Type: Task
          Resource: ...
          Retry:
            - ErrorEquals: [States.TaskFailed]
              MaxAttempts: 2
        GenerateReport:
          Type: Task
          Resource: ...
          End: true
        Failed:
          Type: Fail
```

### 1.3 Workflow Step Functions

Three Lambda functions execute the workflow steps. Each receives the output of the previous step as input
and returns enriched data for the next step.

### 1.4 Start Workflow Function

An HTTP-triggered Lambda that starts workflow executions and checks their status:

- `POST /start` - starts a new execution with the request body as input
- `GET /status/:executionArn` - returns the current status and output of an execution

**ConnectTo** grants the function permission to start and describe Step Functions executions.

```yml
startWorkflow:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/start-workflow.ts
    connectTo:
      - workflow
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /start
          method: POST
      - type: http-api-gateway
        properties:
          httpApiGatewayName: apiGateway
          path: /status/{executionArn+}
          method: GET
```
