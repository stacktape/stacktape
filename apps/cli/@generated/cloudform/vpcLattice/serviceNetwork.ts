import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SharingConfig {
  enabled!: Value<boolean>;
  constructor(properties: SharingConfig) {
    Object.assign(this, properties);
  }
}
export interface ServiceNetworkProperties {
  SharingConfig?: SharingConfig;
  AuthType?: Value<string>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ServiceNetwork extends ResourceBase<ServiceNetworkProperties> {
  static SharingConfig = SharingConfig;
  constructor(properties?: ServiceNetworkProperties) {
    super('AWS::VpcLattice::ServiceNetwork', properties || {});
  }
}
