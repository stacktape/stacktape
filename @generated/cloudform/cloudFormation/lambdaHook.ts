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
export interface LambdaHookProperties {
  HookStatus: Value<string>;
  Alias: Value<string>;
  StackFilters?: StackFilters;
  TargetOperations: List<Value<string>>;
  TargetFilters?: TargetFilters;
  LambdaFunction: Value<string>;
  ExecutionRole: Value<string>;
  FailureMode: Value<string>;
}
export default class LambdaHook extends ResourceBase<LambdaHookProperties> {
  static HookTarget = HookTarget;
  static StackFilters = StackFilters;
  static StackNames = StackNames;
  static StackRoles = StackRoles;
  static TargetFilters = TargetFilters;
  constructor(properties: LambdaHookProperties) {
    super('AWS::CloudFormation::LambdaHook', properties);
  }
}
