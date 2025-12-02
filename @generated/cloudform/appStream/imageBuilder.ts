import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessEndpoint {
  EndpointType!: Value<string>;
  VpceId!: Value<string>;
  constructor(properties: AccessEndpoint) {
    Object.assign(this, properties);
  }
}

export class DomainJoinInfo {
  OrganizationalUnitDistinguishedName?: Value<string>;
  DirectoryName?: Value<string>;
  constructor(properties: DomainJoinInfo) {
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
export interface ImageBuilderProperties {
  Description?: Value<string>;
  VpcConfig?: VpcConfig;
  EnableDefaultInternetAccess?: Value<boolean>;
  DomainJoinInfo?: DomainJoinInfo;
  AppstreamAgentVersion?: Value<string>;
  Name: Value<string>;
  ImageName?: Value<string>;
  DisplayName?: Value<string>;
  IamRoleArn?: Value<string>;
  InstanceType: Value<string>;
  Tags?: List<ResourceTag>;
  ImageArn?: Value<string>;
  AccessEndpoints?: List<AccessEndpoint>;
}
export default class ImageBuilder extends ResourceBase<ImageBuilderProperties> {
  static AccessEndpoint = AccessEndpoint;
  static DomainJoinInfo = DomainJoinInfo;
  static VpcConfig = VpcConfig;
  constructor(properties: ImageBuilderProperties) {
    super('AWS::AppStream::ImageBuilder', properties);
  }
}
