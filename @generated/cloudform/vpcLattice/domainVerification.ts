import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class TxtMethodConfig {
  name?: Value<string>;
  value?: Value<string>;
  constructor(properties: TxtMethodConfig) {
    Object.assign(this, properties);
  }
}
export interface DomainVerificationProperties {
  DomainName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DomainVerification extends ResourceBase<DomainVerificationProperties> {
  static TxtMethodConfig = TxtMethodConfig;
  constructor(properties: DomainVerificationProperties) {
    super('AWS::VpcLattice::DomainVerification', properties);
  }
}
