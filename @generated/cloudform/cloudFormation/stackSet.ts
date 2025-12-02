import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AutoDeployment {
  Enabled?: Value<boolean>;
  RetainStacksOnAccountRemoval?: Value<boolean>;
  constructor(properties: AutoDeployment) {
    Object.assign(this, properties);
  }
}

export class DeploymentTargets {
  AccountFilterType?: Value<string>;
  Accounts?: List<Value<string>>;
  AccountsUrl?: Value<string>;
  OrganizationalUnitIds?: List<Value<string>>;
  constructor(properties: DeploymentTargets) {
    Object.assign(this, properties);
  }
}

export class ManagedExecution {
  Active?: Value<boolean>;
  constructor(properties: ManagedExecution) {
    Object.assign(this, properties);
  }
}

export class OperationPreferences {
  MaxConcurrentPercentage?: Value<number>;
  RegionConcurrencyType?: Value<string>;
  MaxConcurrentCount?: Value<number>;
  FailureTolerancePercentage?: Value<number>;
  ConcurrencyMode?: Value<string>;
  FailureToleranceCount?: Value<number>;
  RegionOrder?: List<Value<string>>;
  constructor(properties: OperationPreferences) {
    Object.assign(this, properties);
  }
}

export class Parameter {
  ParameterValue!: Value<string>;
  ParameterKey!: Value<string>;
  constructor(properties: Parameter) {
    Object.assign(this, properties);
  }
}

export class StackInstances {
  ParameterOverrides?: List<Parameter>;
  DeploymentTargets!: DeploymentTargets;
  Regions!: List<Value<string>>;
  constructor(properties: StackInstances) {
    Object.assign(this, properties);
  }
}
export interface StackSetProperties {
  Description?: Value<string>;
  Parameters?: List<Parameter>;
  StackInstancesGroup?: List<StackInstances>;
  TemplateBody?: Value<string>;
  StackSetName: Value<string>;
  CallAs?: Value<string>;
  OperationPreferences?: OperationPreferences;
  TemplateURL?: Value<string>;
  AutoDeployment?: AutoDeployment;
  Capabilities?: List<Value<string>>;
  PermissionModel: Value<string>;
  AdministrationRoleARN?: Value<string>;
  ExecutionRoleName?: Value<string>;
  ManagedExecution?: ManagedExecution;
  Tags?: List<ResourceTag>;
}
export default class StackSet extends ResourceBase<StackSetProperties> {
  static AutoDeployment = AutoDeployment;
  static DeploymentTargets = DeploymentTargets;
  static ManagedExecution = ManagedExecution;
  static OperationPreferences = OperationPreferences;
  static Parameter = Parameter;
  static StackInstances = StackInstances;
  constructor(properties: StackSetProperties) {
    super('AWS::CloudFormation::StackSet', properties);
  }
}
