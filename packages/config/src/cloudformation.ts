// The CloudFormation value vocabulary a Stacktape configuration is authored against.
//
// These declarations used to live in `apps/cli/scripts/cloudform-root-helpers`, which the CLI copies into its
// generated `@generated/cloudform` tree. They are moved here because they are part of the authored
// configuration language rather than of template emission: `cloudformationResources` is the documented escape
// hatch for raw CloudFormation, and `IntrinsicFunction` is what a user writes wherever a value may be a
// reference instead of a literal. The CLI's cloudform root helpers now import them, so there is still exactly
// one definition of each; `ResourceBase`, `ResourceTag`, `ConditionIntrinsicFunction` and the `DataType` enum
// stay with the CLI because they are emission machinery, not authored configuration.
//
// These comments are deliberately not JSDoc: every JSDoc block reachable from `StacktapeConfig` becomes a
// customer-visible `description` in the published config schema, and these declarations have never carried one.
export class IntrinsicFunction {
  constructor(
    private name: string,
    private payload: any
  ) {}

  toJSON() {
    return { [this.name]: this.payload };
  }
}

export type Value<T> = T | IntrinsicFunction;
export type List<T> = T[] | IntrinsicFunction;

export type CreationPolicy = {
  AutoScalingCreationPolicy?: {
    MinSuccessfulInstancesPercent?: Value<number>;
  };
  ResourceSignal?: {
    Count?: Value<number>;
    Timeout?: Value<string>;
  };
};

export enum DeletionPolicy {
  Delete = 'Delete',
  Retain = 'Retain',
  Snapshot = 'Snapshot'
}

export type UpdatePolicy = {
  AutoScalingReplacingUpdate?: {
    WillReplace?: Value<boolean>;
  };
  AutoScalingRollingUpdate?: {
    MaxBatchSize?: Value<number>;
    MinInstancesInService?: Value<number>;
    MinSuccessfulInstancesPercent?: Value<number>;
    PauseTime?: Value<string>;
    SuspendProcesses?: List<string>;
    WaitOnResourceSignals?: Value<boolean>;
  };
  AutoScalingScheduledAction?: {
    IgnoreUnmodifiedGroupSizeProperties?: Value<boolean>;
  };
  CodeDeployLambdaAliasUpdate?: {
    AfterAllowTrafficHook: Value<string>;
    ApplicationName: Value<string>;
    BeforeAllowTrafficHook: Value<string>;
    DeploymentGroupName: Value<string>;
  };
};

// One raw CloudFormation resource, as written under `cloudformationResources`.
export type CloudformationResource = {
  Type: string;
  DependsOn?: Value<string> | List<string>;
  Properties?: { [key: string]: any };
  Metadata?: { [key: string]: any };
  CreationPolicy?: CreationPolicy;
  DeletionPolicy?: DeletionPolicy;
  UpdatePolicy?: UpdatePolicy;
  Condition?: Value<string>;
};
