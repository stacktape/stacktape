import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IamAuthConfiguration {
  CreatedAt?: Value<string>;
  OperatorAppRoleArn!: Value<string>;
  UpdatedAt?: Value<string>;
  constructor(properties: IamAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class IdcAuthConfiguration {
  IdcApplicationArn?: Value<string>;
  CreatedAt?: Value<string>;
  OperatorAppRoleArn!: Value<string>;
  UpdatedAt?: Value<string>;
  IdcInstanceArn!: Value<string>;
  constructor(properties: IdcAuthConfiguration) {
    Object.assign(this, properties);
  }
}

export class OperatorApp {
  Iam?: IamAuthConfiguration;
  Idc?: IdcAuthConfiguration;
  constructor(properties: OperatorApp) {
    Object.assign(this, properties);
  }
}
export interface AgentSpaceProperties {
  Locale?: Value<string>;
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  OperatorApp?: OperatorApp;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AgentSpace extends ResourceBase<AgentSpaceProperties> {
  static IamAuthConfiguration = IamAuthConfiguration;
  static IdcAuthConfiguration = IdcAuthConfiguration;
  static OperatorApp = OperatorApp;
  constructor(properties: AgentSpaceProperties) {
    super('AWS::DevOpsAgent::AgentSpace', properties);
  }
}
