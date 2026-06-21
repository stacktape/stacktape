import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface TransitGatewayMeteringPolicyProperties {
  TransitGatewayId: Value<string>;
  MiddleboxAttachmentIds?: List<Value<string>>;
  Tags?: List<ResourceTag>;
}
export default class TransitGatewayMeteringPolicy extends ResourceBase<TransitGatewayMeteringPolicyProperties> {
  constructor(properties: TransitGatewayMeteringPolicyProperties) {
    super('AWS::EC2::TransitGatewayMeteringPolicy', properties);
  }
}
