# State Machine

Resource type: `state-machine`

## TypeScript Definition

```typescript
/**
 * #### Visual workflow engine for orchestrating Lambda functions, API calls, and other AWS services.
 *
 * ---
 *
 * Define multi-step workflows with branching, retries, parallel execution, and error handling —
 * all without writing orchestration code. Pay per state transition (~$0.025/1,000 transitions).
 * Defined using [Amazon States Language (ASL)](https://states-language.net/spec.html).
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   processOrder:
 *     type: function
 *     properties:
 *       packaging:
 *         type: stacktape-lambda-buildpack
 *         properties:
 *           entryfilePath: ./src/process-order.ts
 *
 *   orderWorkflow:
 *     type: state-machine
 *     properties:
 *       definition:
 *         StartAt: ProcessOrder
 *         States:
 *           ProcessOrder:
 *             Type: Task
 *             Resource:
 *               Fn::GetAtt:
 *                 - ProcessOrderFunction
 *                 - Arn
 *             End: true
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const processOrder = new LambdaFunction({
 *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/process-order.ts' })
 *   });
 *   const orderWorkflow = new StateMachine({
 *     definition: {
 *       StartAt: 'ProcessOrder',
 *       States: {
 *         ProcessOrder: {
 *           Type: 'Task',
 *           Resource: { 'Fn::GetAtt': ['ProcessOrderFunction', 'Arn'] },
 *           End: true
 *         }
 *       }
 *     }
 *   });
 *   return { resources: { processOrder, orderWorkflow } };
 * });
 * ```
 */
interface StateMachine {
  type: 'state-machine';
  properties: StateMachineProps;
  overrides?: ResourceOverrides;
}

interface StateMachineProps {
  /**
   * #### The workflow definition in [Amazon States Language (ASL)](https://states-language.net/spec.html).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   chargeCard:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/charge-card.ts
   *
   *   paymentWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Charge the customer's card
   *         StartAt: ChargeCard
   *         States:
   *           ChargeCard:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - ChargeCardFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const chargeCard = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/charge-card.ts' })
   *   });
   *   const paymentWorkflow = new StateMachine({
   *     definition: {
   *       Comment: "Charge the customer's card",
   *       StartAt: 'ChargeCard',
   *       States: {
   *         ChargeCard: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['ChargeCardFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { chargeCard, paymentWorkflow } };
   * });
   * ```
   */
  definition: StateMachineDefinition;
}
interface StateMachineDefinition {
  /**
   * #### A human-readable description of the state machine.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   sendEmail:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/send-email.ts
   *
   *   notifyWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Sends a welcome email to newly registered users
   *         StartAt: SendEmail
   *         States:
   *           SendEmail:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - SendEmailFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const sendEmail = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/send-email.ts' })
   *   });
   *   const notifyWorkflow = new StateMachine({
   *     definition: {
   *       Comment: 'Sends a welcome email to newly registered users',
   *       StartAt: 'SendEmail',
   *       States: {
   *         SendEmail: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['SendEmailFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { sendEmail, notifyWorkflow } };
   * });
   * ```
   */
  Comment?: string;
  /**
   * #### The name of the state to start the execution at.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   validateInput:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/validate-input.ts
   *
   *   ingestWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Validate incoming data before processing
   *         StartAt: ValidateInput
   *         States:
   *           ValidateInput:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - ValidateInputFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const validateInput = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/validate-input.ts' })
   *   });
   *   const ingestWorkflow = new StateMachine({
   *     definition: {
   *       Comment: 'Validate incoming data before processing',
   *       StartAt: 'ValidateInput',
   *       States: {
   *         ValidateInput: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['ValidateInputFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { validateInput, ingestWorkflow } };
   * });
   * ```
   */
  StartAt: string;
  /**
   * #### An object containing the states of the state machine.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   extract:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/extract.ts
   *   transform:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/transform.ts
   *
   *   etlWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Two-step ETL pipeline
   *         StartAt: Extract
   *         States:
   *           Extract:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - ExtractFunction
   *                 - Arn
   *             Next: Transform
   *           Transform:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - TransformFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const extract = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/extract.ts' })
   *   });
   *   const transform = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/transform.ts' })
   *   });
   *   const etlWorkflow = new StateMachine({
   *     definition: {
   *       Comment: 'Two-step ETL pipeline',
   *       StartAt: 'Extract',
   *       States: {
   *         Extract: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['ExtractFunction', 'Arn'] },
   *           Next: 'Transform'
   *         },
   *         Transform: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['TransformFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { extract, transform, etlWorkflow } };
   * });
   * ```
   */
  States: {
    [k: string]: State;
  };
  /**
   * #### The version of the Amazon States Language.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   doWork:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/do-work.ts
   *
   *   versionedWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Pins the Amazon States Language version
   *         Version: '1.0'
   *         StartAt: DoWork
   *         States:
   *           DoWork:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - DoWorkFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const doWork = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/do-work.ts' })
   *   });
   *   const versionedWorkflow = new StateMachine({
   *     definition: {
   *       Comment: 'Pins the Amazon States Language version',
   *       Version: '1.0',
   *       StartAt: 'DoWork',
   *       States: {
   *         DoWork: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['DoWorkFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { doWork, versionedWorkflow } };
   * });
   * ```
   */
  Version?: string;
  /**
   * #### The maximum time, in seconds, that a state machine can run.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   longTask:
   *     type: function
   *     properties:
   *       packaging:
   *         type: stacktape-lambda-buildpack
   *         properties:
   *           entryfilePath: ./src/long-task.ts
   *
   *   boundedWorkflow:
   *     type: state-machine
   *     properties:
   *       definition:
   *         Comment: Fails the execution if it runs longer than 1 hour
   *         StartAt: LongTask
   *         TimeoutSeconds: 3600
   *         States:
   *           LongTask:
   *             Type: Task
   *             Resource:
   *               Fn::GetAtt:
   *                 - LongTaskFunction
   *                 - Arn
   *             End: true
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const longTask = new LambdaFunction({
   *     packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/long-task.ts' })
   *   });
   *   const boundedWorkflow = new StateMachine({
   *     definition: {
   *       Comment: 'Fails the execution if it runs longer than 1 hour',
   *       StartAt: 'LongTask',
   *       TimeoutSeconds: 3600,
   *       States: {
   *         LongTask: {
   *           Type: 'Task',
   *           Resource: { 'Fn::GetAtt': ['LongTaskFunction', 'Arn'] },
   *           End: true
   *         }
   *       }
   *     }
   *   });
   *   return { resources: { longTask, boundedWorkflow } };
   * });
   * ```
   */
  TimeoutSeconds?: number;
}

interface Choice {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  Choices: Operator[];
  Default?: string;
}
interface Operator {
  Variable?: string;
  Next?: string;
  And?: Operator[];
  Or?: Operator[];
  Not?: Operator;
  BooleanEquals?: boolean;
  NumericEquals?: number;
  NumericGreaterThan?: number;
  NumericGreaterThanEquals?: number;
  NumericLessThan?: number;
  NumericLessThanEquals?: number;
  StringEquals?: string;
  StringGreaterThan?: string;
  StringGreaterThanEquals?: string;
  StringLessThan?: string;
  StringLessThanEquals?: string;
  TimestampEquals?: string;
  TimestampGreaterThan?: string;
  TimestampGreaterThanEquals?: string;
  TimestampLessThan?: string;
  TimestampLessThanEquals?: string;
  [k: string]: any;
}

interface Fail {
  Type: string;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  Cause?: string;
  Error?: string;
}

interface StateMachineMap {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  ResultPath?: string | null;
  ItemsPath?: string | null;
  MaxConcurrency?: number;
  Iterator: StpStateMachine;
  Parameters?: {
    [k: string]: any;
  };
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
}

interface Parallel {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  ResultPath?: string | null;
  Branches: StpStateMachine[];
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
}

interface Pass {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  ResultPath?: string;
  Parameters?: {
    [k: string]: any;
  };
  Result?: any;
}

type State = Choice | Fail | Parallel | Pass | Succeed | Task | Wait | StateMachineMap;

interface Succeed {
  Type: string;
  Comment?: string;
}

interface Task {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  Resource:
    | string
    | {
        [k: string]: any;
      };
  ResultPath?: string | null;
  Retry?: {
    ErrorEquals: string[];
    IntervalSeconds?: number;
    MaxAttempts?: number;
    BackoffRate?: number;
    [k: string]: any;
  }[];
  Catch?: {
    ErrorEquals: string[];
    Next: string;
    [k: string]: any;
  }[];
  TimeoutSeconds?: number;
  HeartbeatSeconds?: number;
  Parameters?: {
    [k: string]: any;
  };
}

interface Wait {
  Type: string;
  Next?: string;
  End?: true;
  Comment?: string;
  OutputPath?: string | null;
  InputPath?: string | null;
  Seconds?: number;
  Timestamp?: string;
  SecondsPath?: string | null;
  TimestampPath?: string | null;
}

type StateMachineReferencableParam = 'arn' | 'name';
```
