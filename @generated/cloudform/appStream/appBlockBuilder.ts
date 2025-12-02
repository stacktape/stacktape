import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessEndpoint {
  EndpointType!: Value<string>;
  VpceId!: Value<string>;
  constructor(properties: AccessEndpoint) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface AppBlockBuilderProperties {
  Description?: Value<string>;
  Platform: Value<string>;
  VpcConfig: VpcConfig;
  AppBlockArns?: List<Value<string>>;
  EnableDefaultInternetAccess?: Value<boolean>;
  DisplayName?: Value<string>;
  IamRoleArn?: Value<string>;
  InstanceType: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  AccessEndpoints?: List<AccessEndpoint>;
}
export default class AppBlockBuilder extends ResourceBase<AppBlockBuilderProperties> {
  static AccessEndpoint = AccessEndpoint;
  static VpcConfig = VpcConfig;
  constructor(properties: AppBlockBuilderProperties) {
    super('AWS::AppStream::AppBlockBuilder', properties);
  }
}
