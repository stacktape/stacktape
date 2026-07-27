import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class VpcInformation {
  IpAddressType?: Value<string>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VpcInformation) {
    Object.assign(this, properties);
  }
}
export interface ConnectorProperties {
  CertificateAuthorityArn: Value<string>;
  DirectoryId: Value<string>;
  VpcInformation: VpcInformation;
  Tags?: { [key: string]: Value<string> };
}
export default class Connector extends ResourceBase<ConnectorProperties> {
  static VpcInformation = VpcInformation;
  constructor(properties: ConnectorProperties) {
    super('AWS::PCAConnectorAD::Connector', properties);
  }
}
