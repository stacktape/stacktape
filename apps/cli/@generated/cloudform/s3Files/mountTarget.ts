import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface MountTargetProperties {
  IpAddressType?: Value<string>;
  SecurityGroups?: List<Value<string>>;
  FileSystemId: Value<string>;
  SubnetId: Value<string>;
  Ipv6Address?: Value<string>;
  Ipv4Address?: Value<string>;
}
export default class MountTarget extends ResourceBase<MountTargetProperties> {
  constructor(properties: MountTargetProperties) {
    super('AWS::S3Files::MountTarget', properties);
  }
}
