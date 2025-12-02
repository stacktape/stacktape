import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EnaSrdSpecification {
  EnaSrdEnabled?: Value<boolean>;
  EnaSrdUdpSpecification?: EnaSrdUdpSpecification;
  constructor(properties: EnaSrdSpecification) {
    Object.assign(this, properties);
  }
}

export class EnaSrdUdpSpecification {
  EnaSrdUdpEnabled?: Value<boolean>;
  constructor(properties: EnaSrdUdpSpecification) {
    Object.assign(this, properties);
  }
}
export interface NetworkInterfaceAttachmentProperties {
  EnaSrdSpecification?: EnaSrdSpecification;
  InstanceId: Value<string>;
  DeviceIndex: Value<string>;
  EnaQueueCount?: Value<number>;
  NetworkInterfaceId: Value<string>;
  DeleteOnTermination?: Value<boolean>;
}
export default class NetworkInterfaceAttachment extends ResourceBase<NetworkInterfaceAttachmentProperties> {
  static EnaSrdSpecification = EnaSrdSpecification;
  static EnaSrdUdpSpecification = EnaSrdUdpSpecification;
  constructor(properties: NetworkInterfaceAttachmentProperties) {
    super('AWS::EC2::NetworkInterfaceAttachment', properties);
  }
}
