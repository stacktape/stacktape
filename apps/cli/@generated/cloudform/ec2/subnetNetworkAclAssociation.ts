import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SubnetNetworkAclAssociationProperties {
  NetworkAclId: Value<string>;
  SubnetId: Value<string>;
}
export default class SubnetNetworkAclAssociation extends ResourceBase<SubnetNetworkAclAssociationProperties> {
  constructor(properties: SubnetNetworkAclAssociationProperties) {
    super('AWS::EC2::SubnetNetworkAclAssociation', properties);
  }
}
