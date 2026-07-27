import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayMeteringPolicyEntryProperties {
  DestinationPortRange?: Value<string>;
  DestinationTransitGatewayAttachmentId?: Value<string>;
  MeteredAccount: Value<string>;
  SourcePortRange?: Value<string>;
  PolicyRuleNumber: Value<number>;
  DestinationTransitGatewayAttachmentType?: Value<string>;
  SourceCidrBlock?: Value<string>;
  DestinationCidrBlock?: Value<string>;
  Protocol?: Value<string>;
  TransitGatewayMeteringPolicyId: Value<string>;
  SourceTransitGatewayAttachmentId?: Value<string>;
  SourceTransitGatewayAttachmentType?: Value<string>;
}
export default class TransitGatewayMeteringPolicyEntry extends ResourceBase<TransitGatewayMeteringPolicyEntryProperties> {
  constructor(properties: TransitGatewayMeteringPolicyEntryProperties) {
    super('AWS::EC2::TransitGatewayMeteringPolicyEntry', properties);
  }
}
