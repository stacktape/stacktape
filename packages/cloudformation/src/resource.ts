import type { CloudFormationList, CloudFormationValue, ConditionExpression, Intrinsic } from './intrinsics.ts';
import type { CloudFormationResourceProperties, KnownCloudFormationResourceType } from '../generated/resource-types.ts';

export type CloudFormationCreationPolicy = {
  AutoScalingCreationPolicy?: {
    MinSuccessfulInstancesPercent?: CloudFormationValue<number>;
  };
  ResourceSignal?: {
    Count?: CloudFormationValue<number>;
    Timeout?: CloudFormationValue<string>;
  };
};

export type CloudFormationDeletionPolicy = 'Delete' | 'Retain' | 'RetainExceptOnCreate' | 'Snapshot';
export type CloudFormationUpdateReplacePolicy = 'Delete' | 'Retain' | 'Snapshot';

export type CloudFormationUpdatePolicy = {
  AutoScalingReplacingUpdate?: {
    WillReplace?: CloudFormationValue<boolean>;
  };
  AutoScalingRollingUpdate?: {
    MaxBatchSize?: CloudFormationValue<number>;
    MinInstancesInService?: CloudFormationValue<number>;
    MinSuccessfulInstancesPercent?: CloudFormationValue<number>;
    PauseTime?: CloudFormationValue<string>;
    SuspendProcesses?: CloudFormationList<string>;
    WaitOnResourceSignals?: CloudFormationValue<boolean>;
  };
  AutoScalingScheduledAction?: {
    IgnoreUnmodifiedGroupSizeProperties?: CloudFormationValue<boolean>;
  };
  CodeDeployLambdaAliasUpdate?: {
    AfterAllowTrafficHook: CloudFormationValue<string>;
    ApplicationName: CloudFormationValue<string>;
    BeforeAllowTrafficHook: CloudFormationValue<string>;
    DeploymentGroupName: CloudFormationValue<string>;
  };
  EnableVersionUpgrade?: CloudFormationValue<boolean>;
  UseOnlineResharding?: CloudFormationValue<boolean>;
};

/** Standard attributes accepted beside `Type` and `Properties` on a CloudFormation resource. */
export type CloudFormationResourceAttributes = {
  Condition?: string;
  CreationPolicy?: CloudFormationCreationPolicy;
  DeletionPolicy?: CloudFormationDeletionPolicy;
  DependsOn?: string | string[];
  Metadata?: Record<string, unknown>;
  UpdatePolicy?: CloudFormationUpdatePolicy;
  UpdateReplacePolicy?: CloudFormationUpdateReplacePolicy;
};

export type CloudFormationResource<
  Type extends string = string,
  Properties extends object = object
> = CloudFormationResourceAttributes & {
  Type: Type;
  Properties: Properties;
};

export type PropertylessCloudFormationResource<Type extends string = string> = CloudFormationResourceAttributes & {
  Type: Type;
  Properties?: never;
};

export type AnyCloudFormationResource =
  | CloudFormationResource<string, object>
  | PropertylessCloudFormationResource<string>;

export type KnownCloudFormationResource<Type extends KnownCloudFormationResourceType> = CloudFormationResource<
  Type,
  CloudFormationResourceProperties[Type]
>;

export function cfnResource<
  const Type extends KnownCloudFormationResourceType,
  Properties extends CloudFormationResourceProperties[Type]
>(type: Type, properties: Properties): CloudFormationResource<Type, Properties> {
  return { Type: type, Properties: properties };
}

export function cfnResourceUnchecked<const Type extends string>(type: Type): PropertylessCloudFormationResource<Type>;
export function cfnResourceUnchecked<const Type extends string, const Properties extends object>(
  type: Type,
  properties: Properties
): CloudFormationResource<Type, Properties>;
export function cfnResourceUnchecked(type: string, properties?: object): AnyCloudFormationResource {
  return properties === undefined ? { Type: type } : { Type: type, Properties: properties };
}

export type CloudFormationParameter = {
  Type: string;
  AllowedPattern?: string;
  AllowedValues?: Array<string | number>;
  ConstraintDescription?: string;
  Default?: string | number | boolean | Array<string | number>;
  Description?: string;
  MaxLength?: number;
  MaxValue?: number;
  MinLength?: number;
  MinValue?: number;
  NoEcho?: boolean;
};

export type CloudFormationOutput = {
  Value: CloudFormationValue<string | number | boolean>;
  Condition?: string;
  Description?: string;
  Export?: { Name: CloudFormationValue<string> };
};

export type CloudFormationTemplate = {
  AWSTemplateFormatVersion?: '2010-09-09';
  Conditions?: Record<string, ConditionExpression | CloudFormationValue<boolean>>;
  Description?: string;
  Hooks?: Record<string, unknown>;
  Mappings?: Record<string, Record<string, Record<string, string | string[]>>>;
  Metadata?: Record<string, unknown>;
  Outputs?: Record<string, CloudFormationOutput>;
  Parameters?: Record<string, CloudFormationParameter>;
  Resources: Record<string, AnyCloudFormationResource>;
  Rules?: Record<string, unknown>;
  Transform?: string | string[];
};

export type { Intrinsic, KnownCloudFormationResourceType };
