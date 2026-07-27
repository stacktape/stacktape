import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DashboardAttributes {
  EngagementMetrics?: Value<string>;
  constructor(properties: DashboardAttributes) {
    Object.assign(this, properties);
  }
}

export class GuardianAttributes {
  OptimizedSharedDelivery?: Value<string>;
  constructor(properties: GuardianAttributes) {
    Object.assign(this, properties);
  }
}
export interface VdmAttributesProperties {
  DashboardAttributes?: DashboardAttributes;
  GuardianAttributes?: GuardianAttributes;
}
export default class VdmAttributes extends ResourceBase<VdmAttributesProperties> {
  static DashboardAttributes = DashboardAttributes;
  static GuardianAttributes = GuardianAttributes;
  constructor(properties?: VdmAttributesProperties) {
    super('AWS::SES::VdmAttributes', properties || {});
  }
}
