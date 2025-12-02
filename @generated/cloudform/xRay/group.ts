import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class InsightsConfiguration {
  NotificationsEnabled?: Value<boolean>;
  InsightsEnabled?: Value<boolean>;
  constructor(properties: InsightsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface GroupProperties {
  GroupName: Value<string>;
  InsightsConfiguration?: InsightsConfiguration;
  FilterExpression?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Group extends ResourceBase<GroupProperties> {
  static InsightsConfiguration = InsightsConfiguration;
  constructor(properties: GroupProperties) {
    super('AWS::XRay::Group', properties);
  }
}
