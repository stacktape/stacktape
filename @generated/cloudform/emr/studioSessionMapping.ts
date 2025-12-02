import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface StudioSessionMappingProperties {
  IdentityType: Value<string>;
  SessionPolicyArn: Value<string>;
  StudioId: Value<string>;
  IdentityName: Value<string>;
}
export default class StudioSessionMapping extends ResourceBase<StudioSessionMappingProperties> {
  constructor(properties: StudioSessionMappingProperties) {
    super('AWS::EMR::StudioSessionMapping', properties);
  }
}
