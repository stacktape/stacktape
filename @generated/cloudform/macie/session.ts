import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SessionProperties {
  Status?: Value<string>;
  FindingPublishingFrequency?: Value<string>;
}
export default class Session extends ResourceBase<SessionProperties> {
  constructor(properties?: SessionProperties) {
    super('AWS::Macie::Session', properties || {});
  }
}
