import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FailedReason {
  Message?: Value<string>;
  ErrorCode?: Value<string>;
  constructor(properties: FailedReason) {
    Object.assign(this, properties);
  }
}

export class NetworkInterface {
  NetworkInterfaceId!: Value<string>;
  constructor(properties: NetworkInterface) {
    Object.assign(this, properties);
  }
}
export interface EndpointProperties {
  OutpostId: Value<string>;
  SecurityGroupId: Value<string>;
  FailedReason?: FailedReason;
  SubnetId: Value<string>;
  AccessType?: Value<string>;
  CustomerOwnedIpv4Pool?: Value<string>;
}
export default class Endpoint extends ResourceBase<EndpointProperties> {
  static FailedReason = FailedReason;
  static NetworkInterface = NetworkInterface;
  constructor(properties: EndpointProperties) {
    super('AWS::S3Outposts::Endpoint', properties);
  }
}
