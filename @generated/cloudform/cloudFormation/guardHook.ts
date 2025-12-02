import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HookTarget {
  InvocationPoint!: Value<string>;
  Action!: Value<string>;
  TargetName!: Value<string>;
  constructor(properties: HookTarget) {
    Object.assign(this, properties);
  }
}

export class Options {
  InputParams?: S3Location;
  constructor(properties: Options) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  VersionId?: Value<string>;
  Uri!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class StackFilters {
  FilteringCriteria!: Value<string>;
  StackNames?: StackNames;
  StackRoles?: StackRoles;
  constructor(properties: StackFilters) {
    Object.assign(this, properties);
  }
}

export class StackNames {
  Exclude?: List<Value<string>>;
  Include?: List<Value<string>>;
  constructor(properties: StackNames) {
    Object.assign(this, properties);
  }
}

export class StackRoles {
  Exclude?: List<Value<string>>;
  Include?: List<Value<string>>;
  constructor(properties: StackRoles) {
    Object.assign(this, properties);
  }
}

export class TargetFilters {
  Actions?: List<Value<string>>;
  TargetNames?: List<Value<string>>;
  Targets?: List<HookTarget>;
  InvocationPoints?: List<Value<string>>;
  constructor(properties: TargetFilters) {
    Object.assign(this, properties);
  }
}
export interface GuardHookProperties {
  Options?: Options;
  RuleLocation: S3Location;
  HookStatus: Value<string>;
  Alias: Value<string>;
  StackFilters?: StackFilters;
  TargetOperations: List<Value<string>>;
  TargetFilters?: TargetFilters;
  LogBucket?: Value<string>;
  ExecutionRole: Value<string>;
  FailureMode: Value<string>;
}
export default class GuardHook extends ResourceBase<GuardHookProperties> {
  static HookTarget = HookTarget;
  static Options = Options;
  static S3Location = S3Location;
  static StackFilters = StackFilters;
  static StackNames = StackNames;
  static StackRoles = StackRoles;
  static TargetFilters = TargetFilters;
  constructor(properties: GuardHookProperties) {
    super('AWS::CloudFormation::GuardHook', properties);
  }
}
