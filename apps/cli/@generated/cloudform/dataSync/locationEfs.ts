import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Ec2Config {
  SubnetArn!: Value<string>;
  SecurityGroupArns!: List<Value<string>>;
  constructor(properties: Ec2Config) {
    Object.assign(this, properties);
  }
}
export interface LocationEFSProperties {
  EfsFilesystemArn?: Value<string>;
  Ec2Config: Ec2Config;
  AccessPointArn?: Value<string>;
  Subdirectory?: Value<string>;
  InTransitEncryption?: Value<string>;
  FileSystemAccessRoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class LocationEFS extends ResourceBase<LocationEFSProperties> {
  static Ec2Config = Ec2Config;
  constructor(properties: LocationEFSProperties) {
    super('AWS::DataSync::LocationEFS', properties);
  }
}
