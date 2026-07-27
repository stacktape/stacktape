import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class EmergencyContact {
  ContactNotes?: Value<string>;
  PhoneNumber?: Value<string>;
  EmailAddress!: Value<string>;
  constructor(properties: EmergencyContact) {
    Object.assign(this, properties);
  }
}
export interface ProactiveEngagementProperties {
  ProactiveEngagementStatus: Value<string>;
  EmergencyContactList: List<EmergencyContact>;
}
export default class ProactiveEngagement extends ResourceBase<ProactiveEngagementProperties> {
  static EmergencyContact = EmergencyContact;
  constructor(properties: ProactiveEngagementProperties) {
    super('AWS::Shield::ProactiveEngagement', properties);
  }
}
