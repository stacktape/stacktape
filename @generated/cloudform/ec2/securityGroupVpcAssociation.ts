import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SecurityGroupVpcAssociationProperties {
  VpcId: Value<string>;
  GroupId: Value<string>;
}
export default class SecurityGroupVpcAssociation extends ResourceBase<SecurityGroupVpcAssociationProperties> {
  constructor(properties: SecurityGroupVpcAssociationProperties) {
    super('AWS::EC2::SecurityGroupVpcAssociation', properties);
  }
}
