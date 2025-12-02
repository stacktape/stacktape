import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CdnAuthConfiguration {
  SecretsRoleArn!: Value<string>;
  CdnIdentifierSecretArns!: List<Value<string>>;
  constructor(properties: CdnAuthConfiguration) {
    Object.assign(this, properties);
  }
}
export interface OriginEndpointPolicyProperties {
  Policy: { [key: string]: any };
  ChannelName: Value<string>;
  OriginEndpointName: Value<string>;
  ChannelGroupName: Value<string>;
  CdnAuthConfiguration?: CdnAuthConfiguration;
}
export default class OriginEndpointPolicy extends ResourceBase<OriginEndpointPolicyProperties> {
  static CdnAuthConfiguration = CdnAuthConfiguration;
  constructor(properties: OriginEndpointPolicyProperties) {
    super('AWS::MediaPackageV2::OriginEndpointPolicy', properties);
  }
}
