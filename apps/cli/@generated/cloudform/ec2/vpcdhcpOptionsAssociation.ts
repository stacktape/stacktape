import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface VPCDHCPOptionsAssociationProperties {
  VpcId: Value<string>;
  DhcpOptionsId: Value<string>;
}
export default class VPCDHCPOptionsAssociation extends ResourceBase<VPCDHCPOptionsAssociationProperties> {
  constructor(properties: VPCDHCPOptionsAssociationProperties) {
    super('AWS::EC2::VPCDHCPOptionsAssociation', properties);
  }
}
