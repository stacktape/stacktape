/**
 * #### State Machine
 *
 * ---
 *
 * A state machine allows you to orchestrate and coordinate multiple compute resources to create complex workflows.
 * It is defined using the [Amazon States Language](https://states-language.net/spec.html).
 */
interface StateMachine {
  type: 'state-machine';
  properties: StateMachineProps;
  overrides?: ResourceOverrides;
}

interface StateMachineProps {
  /**
   * #### The definition of the state machine.
   *
   * ---
   *
   * This is written in the [Amazon States Language](https://states-language.net/spec.html).
   */
  definition: StateMachineDefinition;
}
interface StateMachineDefinition {
  /**
   * #### A human-readable description of the state machine.
   */
  Comment?: string;
  /**
   * #### The name of the state to start the execution at.
   */
  StartAt: string;
  /**
   * #### An object containing the states of the state machine.
   */
  States: {
    [k: string]: State;
  };
  /**
   * #### The version of the Amazon States Language.
   */
  Version?: string;
  /**
   * #### The maximum time, in seconds, that a state machine can run.
   */
  TimeoutSeconds?: number;
}

type StpStateMachine = StateMachine['properties'] & {
  name: string;
  type: StateMachine['type'];
  configParentResourceType: StateMachine['type'];
  nameChain: string[];
};

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
