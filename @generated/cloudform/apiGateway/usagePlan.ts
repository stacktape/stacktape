import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ApiStage {
  Stage?: Value<string>;
  ApiId?: Value<string>;
  Throttle?: { [key: string]: ThrottleSettings };
  constructor(properties: ApiStage) {
    Object.assign(this, properties);
  }
}

export class QuotaSettings {
  Period?: Value<string>;
  Limit?: Value<number>;
  Offset?: Value<number>;
  constructor(properties: QuotaSettings) {
    Object.assign(this, properties);
  }
}

export class ThrottleSettings {
  BurstLimit?: Value<number>;
  RateLimit?: Value<number>;
  constructor(properties: ThrottleSettings) {
    Object.assign(this, properties);
  }
}
export interface UsagePlanProperties {
  Description?: Value<string>;
  Quota?: QuotaSettings;
  ApiStages?: List<ApiStage>;
  Tags?: List<ResourceTag>;
  Throttle?: ThrottleSettings;
  UsagePlanName?: Value<string>;
}
export default class UsagePlan extends ResourceBase<UsagePlanProperties> {
  static ApiStage = ApiStage;
  static QuotaSettings = QuotaSettings;
  static ThrottleSettings = ThrottleSettings;
  constructor(properties?: UsagePlanProperties) {
    super('AWS::ApiGateway::UsagePlan', properties || {});
  }
}
