# StateMachineDefinition API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
type StateMachineDefinition = {
  /** The name of the state to start the execution at. */
  StartAt: string;
  /** An object containing the states of the state machine. */
  States: unknown;
  /** A human-readable description of the state machine. */
  Comment?: string;
  /** The maximum time, in seconds, that a state machine can run. */
  TimeoutSeconds?: number;
  /** The version of the Amazon States Language. */
  Version?: string;
};
```

## Property: `StartAt`

- Required: yes
- Type: `string`

The name of the state to start the execution at.

### Example 1 (yaml)

```yaml
resources:
  validateInput:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/validate-input.ts

  ingestWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Validate incoming data before processing
        StartAt: ValidateInput
        States:
          ValidateInput:
            Type: Task
            Resource:
              Fn::GetAtt:
                - ValidateInputFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const validateInput = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/validate-input.ts' })
  });
  const ingestWorkflow = new StateMachine({
    definition: {
      Comment: 'Validate incoming data before processing',
      StartAt: 'ValidateInput',
      States: {
        ValidateInput: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['ValidateInputFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { validateInput, ingestWorkflow } };
});
```

## Property: `States`

- Required: yes
- Type: `unknown`

An object containing the states of the state machine.

### Example 1 (yaml)

```yaml
resources:
  extract:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/extract.ts
  transform:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/transform.ts

  etlWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Two-step ETL pipeline
        StartAt: Extract
        States:
          Extract:
            Type: Task
            Resource:
              Fn::GetAtt:
                - ExtractFunction
                - Arn
            Next: Transform
          Transform:
            Type: Task
            Resource:
              Fn::GetAtt:
                - TransformFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const extract = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/extract.ts' })
  });
  const transform = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/transform.ts' })
  });
  const etlWorkflow = new StateMachine({
    definition: {
      Comment: 'Two-step ETL pipeline',
      StartAt: 'Extract',
      States: {
        Extract: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['ExtractFunction', 'Arn'] },
          Next: 'Transform'
        },
        Transform: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['TransformFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { extract, transform, etlWorkflow } };
});
```

## Property: `Comment`

- Required: no
- Type: `string`

A human-readable description of the state machine.

### Example 1 (yaml)

```yaml
resources:
  sendEmail:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/send-email.ts

  notifyWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Sends a welcome email to newly registered users
        StartAt: SendEmail
        States:
          SendEmail:
            Type: Task
            Resource:
              Fn::GetAtt:
                - SendEmailFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const sendEmail = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/send-email.ts' })
  });
  const notifyWorkflow = new StateMachine({
    definition: {
      Comment: 'Sends a welcome email to newly registered users',
      StartAt: 'SendEmail',
      States: {
        SendEmail: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['SendEmailFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { sendEmail, notifyWorkflow } };
});
```

## Property: `TimeoutSeconds`

- Required: no
- Type: `number`

The maximum time, in seconds, that a state machine can run.

### Example 1 (yaml)

```yaml
resources:
  longTask:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/long-task.ts

  boundedWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Fails the execution if it runs longer than 1 hour
        StartAt: LongTask
        TimeoutSeconds: 3600
        States:
          LongTask:
            Type: Task
            Resource:
              Fn::GetAtt:
                - LongTaskFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const longTask = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/long-task.ts' })
  });
  const boundedWorkflow = new StateMachine({
    definition: {
      Comment: 'Fails the execution if it runs longer than 1 hour',
      StartAt: 'LongTask',
      TimeoutSeconds: 3600,
      States: {
        LongTask: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['LongTaskFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { longTask, boundedWorkflow } };
});
```

## Property: `Version`

- Required: no
- Type: `string`

The version of the Amazon States Language.

### Example 1 (yaml)

```yaml
resources:
  doWork:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/do-work.ts

  versionedWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Pins the Amazon States Language version
        Version: '1.0'
        StartAt: DoWork
        States:
          DoWork:
            Type: Task
            Resource:
              Fn::GetAtt:
                - DoWorkFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const doWork = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/do-work.ts' })
  });
  const versionedWorkflow = new StateMachine({
    definition: {
      Comment: 'Pins the Amazon States Language version',
      Version: '1.0',
      StartAt: 'DoWork',
      States: {
        DoWork: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['DoWorkFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { doWork, versionedWorkflow } };
});
```
