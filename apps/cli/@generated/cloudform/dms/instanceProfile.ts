import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface InstanceProfileProperties {
  SubnetGroupIdentifier?: Value<string>;
  Description?: Value<string>;
  InstanceProfileName?: Value<string>;
  KmsKeyArn?: Value<string>;
  NetworkType?: Value<string>;
  AvailabilityZone?: Value<string>;
  PubliclyAccessible?: Value<boolean>;
  VpcSecurityGroups?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  InstanceProfileIdentifier?: Value<string>;
}
export default class InstanceProfile extends ResourceBase<InstanceProfileProperties> {
  constructor(properties?: InstanceProfileProperties) {
    super('AWS::DMS::InstanceProfile', properties || {});
  }
}
