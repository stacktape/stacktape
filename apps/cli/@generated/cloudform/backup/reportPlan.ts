import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ReportDeliveryChannel {
  S3KeyPrefix?: Value<string>;
  Formats?: List<Value<string>>;
  S3BucketName!: Value<string>;
  constructor(properties: ReportDeliveryChannel) {
    Object.assign(this, properties);
  }
}

export class ReportSetting {
  FrameworkArns?: List<Value<string>>;
  ReportTemplate!: Value<string>;
  OrganizationUnits?: List<Value<string>>;
  Regions?: List<Value<string>>;
  Accounts?: List<Value<string>>;
  constructor(properties: ReportSetting) {
    Object.assign(this, properties);
  }
}
export interface ReportPlanProperties {
  ReportSetting: ReportSetting;
  ReportPlanDescription?: Value<string>;
  ReportPlanName?: Value<string>;
  ReportDeliveryChannel: ReportDeliveryChannel;
  ReportPlanTags?: List<ResourceTag>;
}
export default class ReportPlan extends ResourceBase<ReportPlanProperties> {
  static ReportDeliveryChannel = ReportDeliveryChannel;
  static ReportSetting = ReportSetting;
  constructor(properties: ReportPlanProperties) {
    super('AWS::Backup::ReportPlan', properties);
  }
}
