import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ThingPrincipalAttachmentProperties {
  Principal: Value<string>;
  ThingName: Value<string>;
  ThingPrincipalType?: Value<string>;
}
export default class ThingPrincipalAttachment extends ResourceBase<ThingPrincipalAttachmentProperties> {
  constructor(properties: ThingPrincipalAttachmentProperties) {
    super('AWS::IoT::ThingPrincipalAttachment', properties);
  }
}
