# State machine

A state machine is an AWS Step Functions workflow: steps that call your Lambda functions and other AWS services, with
branching, retries, parallel branches and loops defined in [Amazon States Language](https://states-language.net/spec.html)
(ASL) instead of code. Each execution has a visible history, and a standard workflow can run for up to a year.

Standard workflows cost $0.025 per 1,000 state transitions in us-east-1, with 4,000 free each month
([Step Functions pricing](https://aws.amazon.com/step-functions/pricing/)), and nothing while idle. For one step after
another without branching or retries, a Lambda function with an [SQS trigger](/resources/triggers/sqs-events) is
simpler and cheaper.

## Basic example

Two [Lambda functions](/resources/compute/lambda-function) in one workflow: it validates an order, branches on the
result, and either processes the order or fails.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StateMachine,
  JsBundleLambdaPackaging,
  $ResourceParam
} from 'stacktape';
export default defineConfig(() => {
  const validateOrder = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/validate-order.ts' })
  });

  const processOrder = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/process-order.ts' }),
    timeout: 60
  });

  const orderWorkflow = new StateMachine({
    definition: {
      Comment: 'Order processing workflow',
      StartAt: 'ValidateOrder',
      States: {
        ValidateOrder: {
          Type: 'Task',
          Resource: $ResourceParam('validateOrder', 'arn'),
          Next: 'CheckValidity',
          Catch: [{ ErrorEquals: ['States.ALL'], Next: 'OrderFailed' }]
        },
        CheckValidity: {
          Type: 'Choice',
          Choices: [{ Variable: '$.valid', BooleanEquals: true, Next: 'ProcessOrder' }],
          Default: 'OrderFailed'
        },
        ProcessOrder: {
          Type: 'Task',
          Resource: $ResourceParam('processOrder', 'arn'),
          Retry: [
            {
              ErrorEquals: ['States.TaskFailed'],
              IntervalSeconds: 3,
              MaxAttempts: 2,
              BackoffRate: 2
            }
          ],
          End: true
        },
        OrderFailed: {
          Type: 'Fail',
          Error: 'OrderProcessingFailed',
          Cause: 'Validation or processing failed'
        }
      }
    }
  });

  return {
    resources: { validateOrder, processOrder, orderWorkflow }
  };
});
```


`StartAt` names the first state and `States` lists them. Each state has a `Type` and moves on with `Next` or ends with
`End: true`; `Succeed` and `Fail` end the execution by themselves. A Task state names its function with
`$ResourceParam('validateOrder', 'arn')`, which becomes the function's ARN at deploy time.

After the deploy, start an execution in the AWS console (**Step Functions → your state machine → Start execution**)
with input such as `{"orderId": "42"}`, and watch each step's input and output in the execution graph.

## Workflow definition

`definition` is an ASL workflow: `StartAt`, `States`, and optionally `Comment`, `Version` and `TimeoutSeconds`.

### State types

Stacktape checks eight ASL state types:

| State type | Purpose | Key properties |
|---|---|---|
| **Task** | Invokes a Lambda function or another supported ASL task target | `Resource`, `Retry`, `Catch`, `TimeoutSeconds`, `HeartbeatSeconds`, `Parameters` |
| **Choice** | Branches based on input conditions | `Choices` (condition rules), `Default` (fallback state) |
| **Parallel** | Runs multiple branches concurrently, waits for all to complete | `Branches` (each a `StartAt`/`States` workflow), `Retry`, `Catch` |
| **Map** | Iterates over an array, running a sub-workflow per item | `ItemProcessor` (or the older `Iterator`), `ItemsPath`, `MaxConcurrency` |
| **Wait** | Pauses execution for a duration or until a timestamp | `Seconds`, `Timestamp`, `SecondsPath`, `TimestampPath` |
| **Pass** | Passes input to output, optionally injecting or transforming data | `Result`, `Parameters`, `ResultPath` |
| **Succeed** | Marks successful completion — terminates the workflow | — |
| **Fail** | Terminates execution with an error | `Error`, `Cause` |

Stacktape checks the state types and the fields listed above. Other ASL fields, such as `QueryLanguage`, `Arguments` or `Assign`, are passed to AWS unchanged, and a path set to `null` (for example `OutputPath: null`) is kept.

### Permissions of the workflow

The workflow runs with one IAM role that Stacktape creates for all state machines in the stack. It can:

- invoke Lambda functions of this stack,
- read and write DynamoDB items, publish to SNS, send to SQS,
- run ECS tasks, submit AWS Batch jobs and run Glue jobs.

A Task that calls another service, for example S3, Bedrock or another state machine, fails at run time with an access
error. Call that service from a Lambda function task instead, and give the function the permission with
`iamRoleStatements`. This role is separate from the role of the code that starts executions; see
[Starting executions](#starting-executions).

### Referencing Lambda functions

Task states use the `Resource` property to identify a Lambda function or another supported ASL task target. For a function in the same config, use the [`$ResourceParam` directive](/configuration/directives) with the function's resource name and its `arn` parameter. Stacktape resolves it to the function's ARN at deploy time.

```yaml
resources:
  scoreReceipt:
    type: function
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/score-receipt.ts
  approvalWorkflow:
    type: state-machine
    properties:
      definition:
        StartAt: ScoreReceipt
        States:
          ScoreReceipt:
            Type: Task
            Resource: $ResourceParam('scoreReceipt', 'arn')
            End: true
```

Use a plain string when you already have a concrete Task `Resource` value, such as the ARN of a function outside this config or an [ASL service integration](https://states-language.net/spec.html) URI. An object with a CloudFormation intrinsic function, such as `Fn::GetAtt`, also works when you need one.

### Workflow timeout

A standard workflow can run for up to a year and bills every transition. Set `TimeoutSeconds` at the top of the
definition for any workflow that should finish in minutes or hours, and on Task states to bound one step.
`HeartbeatSeconds` makes a long task report progress.

## Error handling

AWS Step Functions provides built-in error handling through `Retry` and `Catch` blocks on Task, Parallel, and Map states. This replaces the need for custom retry logic in your Lambda function code and gives you a declarative way to handle failures at the orchestration layer.

**Retry** accepts an array of rules, each specifying which errors to match (`ErrorEquals`), the initial delay (`IntervalSeconds`), maximum attempts (`MaxAttempts`), and backoff multiplier (`BackoffRate`). Multiple retry rules are evaluated in order — the first matching rule is used.

**Catch** routes to a fallback state when all retries are exhausted or for errors not covered by retry rules. Each catch rule matches error types (`ErrorEquals`) and redirects to a named state (`Next`). This lets you build graceful degradation paths, for example notifying a support team when payment processing fails after retries.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StateMachine,
  JsBundleLambdaPackaging,
  $ResourceParam
} from 'stacktape';

export default defineConfig(() => {
  const chargePayment = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/charge.ts' }),
    timeout: 60
  });

  const notifySupport = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/notify-support.ts' })
  });
  const paymentWorkflow = new StateMachine({
    definition: {
      StartAt: 'ChargePayment',
      States: {
        ChargePayment: {
          Type: 'Task',
          Resource: $ResourceParam('chargePayment', 'arn'),
          Retry: [
            {
              ErrorEquals: ['States.TaskFailed'],
              IntervalSeconds: 5,
              MaxAttempts: 3,
              BackoffRate: 2
            }
          ],
          Catch: [
            {
              ErrorEquals: ['States.ALL'],
              Next: 'NotifySupport'
            }
          ],
          Next: 'PaymentComplete'
        },
        NotifySupport: {
          Type: 'Task',
          Resource: $ResourceParam('notifySupport', 'arn'),
          Next: 'PaymentFailed'
        },
        PaymentFailed: {
          Type: 'Fail',
          Error: 'PaymentError',
          Cause: 'Payment failed after 3 retries'
        },
        PaymentComplete: {
          Type: 'Succeed'
        }
      }
    }
  });

  return {
    resources: { chargePayment, notifySupport, paymentWorkflow }
  };
});
```


In this example, `ChargePayment` retries up to 3 times on failure with exponential backoff (5s, 10s, 20s). If all retries fail, `Catch` redirects to `NotifySupport`, which alerts the support team before the workflow terminates with a `Fail` state. Without the retry block, any transient error would immediately fail the workflow.

Retry and Catch match error strings in `ErrorEquals`. Common ASL error names include `States.ALL`, `States.TaskFailed`, `States.Timeout`, and `States.HeartbeatTimeout`. You can also match custom error strings thrown by your Lambda functions. See the [ASL specification](https://states-language.net/spec.html) for the complete list and matching rules.

## Starting executions

To start executions from your code, add the state machine to the workload's
[`connectTo`](/configuration/connecting-resources). The workload's role can then start, stop and describe executions,
and it gets `STP_ORDER_WORKFLOW_ARN` and `STP_ORDER_WORKFLOW_NAME`.


Example (TypeScript):

```typescript
import {
  defineConfig,
  LambdaFunction,
  StateMachine,
  JsBundleLambdaPackaging,
  $ResourceParam
} from 'stacktape';

export default defineConfig(() => {
  const processOrder = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/process-order.ts' })
  });

  const orderWorkflow = new StateMachine({
    definition: {
      StartAt: 'ProcessOrder',
      States: {
        ProcessOrder: {
          Type: 'Task',
          Resource: $ResourceParam('processOrder', 'arn'),
          End: true
        }
      }
    }
  });
  const startOrder = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/start-order.ts' }),
    connectTo: [orderWorkflow]
  });

  return {
    resources: { processOrder, orderWorkflow, startOrder }
  };
});
```


Use the ARN in your handler to start executions:

```typescript
import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});
const stateMachineArn = process.env.STP_ORDER_WORKFLOW_ARN!;

const app = new Hono();

app.post('/orders', async (c) => {
  const input = await c.req.text() || '{}';
  const result = await sfn.send(
    new StartExecutionCommand({ stateMachineArn, input })
  );
  return c.json({ executionArn: result.executionArn }, 202);
});

app.get('/orders/status/:executionArn{.+}', async (c) => {
  const executionArn = decodeURIComponent(c.req.param('executionArn'));
  const result = await sfn.send(new DescribeExecutionCommand({ executionArn }));
  return c.json({
    status: result.status,
    output: result.output ? JSON.parse(result.output) : null
  });
});

export default handle(app);
```

The `POST` route starts an execution and returns its ARN; the `GET` route reports its status and output. Attach
`startOrder` to an [HTTP API Gateway](/resources/networking/http-api-gateway) to call them.

## Express workflows and other settings

The resource exposes only `definition`. Set anything else, such as the workflow type or logging, with
[overrides](/configuration/overrides-and-escape-hatches) of the `AWS::StepFunctions::StateMachine` child resource.

An Express workflow suits high-volume, short work: it runs for at most five minutes and bills per request and duration
instead of per transition. [`stacktape synth`](/cli/synth) shows the child resource's logical name; the example assumes
`OrderWorkflowStateMachine`.


Example (TypeScript):

```typescript
import { defineConfig, StateMachine } from 'stacktape';

export default defineConfig(() => {
  const orderWorkflow = new StateMachine({
    definition: {
      StartAt: 'Process',
      States: {
        Process: { Type: 'Pass', End: true }
      }
    },
    overrides: {
      OrderWorkflowStateMachine: {
        StateMachineType: 'EXPRESS'
      }
    }
  });

  return { resources: { orderWorkflow } };
});
```


## Configuration reference


### Definition: `StateMachineProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/state-machine` with definition name `StateMachineProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `definition` | yes | `StateMachineDefinition` | - |


## Referenceable parameters


## Referenceable Parameters: `state-machine`
These values can be referenced with `$ResourceParam("<<resource-name>>", "<<parameter-name>>")`.

| Parameter | Description | Usage |
| --- | --- | --- |
| `arn` | Arn of the state machine. | `$ResourceParam("<<resource-name>>", "arn")` |
| `name` | AWS (physical) name of the state machine. | `$ResourceParam("<<resource-name>>", "name")` |


## Next steps

- [Lambda function](/resources/compute/lambda-function): write the steps.
- [Batch job](/resources/compute/batch-job): run steps that take longer than 15 minutes.
- [Connecting resources](/configuration/connecting-resources#additional-connectto-targets): let a function start executions.
