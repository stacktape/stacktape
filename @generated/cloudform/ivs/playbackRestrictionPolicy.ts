import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface PlaybackRestrictionPolicyProperties {
  AllowedOrigins?: List<Value<string>>;
  EnableStrictOriginEnforcement?: Value<boolean>;
  AllowedCountries?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class PlaybackRestrictionPolicy extends ResourceBase<PlaybackRestrictionPolicyProperties> {
  constructor(properties?: PlaybackRestrictionPolicyProperties) {
    super('AWS::IVS::PlaybackRestrictionPolicy', properties || {});
  }
}
