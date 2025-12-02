import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IngressVpcConfiguration {
  VpcId!: Value<string>;
  VpcEndpointId!: Value<string>;
  constructor(properties: IngressVpcConfiguration) {
    Object.assign(this, properties);
  }
}
export interface VpcIngressConnectionProperties {
  VpcIngressConnectionName?: Value<string>;
  ServiceArn: Value<string>;
  Tags?: List<ResourceTag>;
  IngressVpcConfiguration: IngressVpcConfiguration;
}
export default class VpcIngressConnection extends ResourceBase<VpcIngressConnectionProperties> {
  static IngressVpcConfiguration = IngressVpcConfiguration;
  constructor(properties: VpcIngressConnectionProperties) {
    super('AWS::AppRunner::VpcIngressConnection', properties);
  }
}
