import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Parameters {
  Epsilon!: Value<number>;
  UsersNoisePerQuery!: Value<number>;
  constructor(properties: Parameters) {
    Object.assign(this, properties);
  }
}
export interface PrivacyBudgetTemplateProperties {
  PrivacyBudgetType: Value<string>;
  MembershipIdentifier: Value<string>;
  Parameters: Parameters;
  Tags?: List<ResourceTag>;
  AutoRefresh: Value<string>;
}
export default class PrivacyBudgetTemplate extends ResourceBase<PrivacyBudgetTemplateProperties> {
  static Parameters = Parameters;
  constructor(properties: PrivacyBudgetTemplateProperties) {
    super('AWS::CleanRooms::PrivacyBudgetTemplate', properties);
  }
}
