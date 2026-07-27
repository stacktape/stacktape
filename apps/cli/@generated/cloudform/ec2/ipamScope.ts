import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IpamScopeExternalAuthorityConfiguration {
  ExternalResourceIdentifier!: Value<string>;
  IpamScopeExternalAuthorityType!: Value<string>;
  constructor(properties: IpamScopeExternalAuthorityConfiguration) {
    Object.assign(this, properties);
  }
}
export interface IPAMScopeProperties {
  Description?: Value<string>;
  IpamId: Value<string>;
  ExternalAuthorityConfiguration?: IpamScopeExternalAuthorityConfiguration;
  Tags?: List<ResourceTag>;
}
export default class IPAMScope extends ResourceBase<IPAMScopeProperties> {
  static IpamScopeExternalAuthorityConfiguration = IpamScopeExternalAuthorityConfiguration;
  constructor(properties: IPAMScopeProperties) {
    super('AWS::EC2::IPAMScope', properties);
  }
}
