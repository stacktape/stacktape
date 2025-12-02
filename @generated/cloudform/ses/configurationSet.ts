import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DashboardOptions {
  EngagementMetrics!: Value<string>;
  constructor(properties: DashboardOptions) {
    Object.assign(this, properties);
  }
}

export class DeliveryOptions {
  MaxDeliverySeconds?: Value<number>;
  SendingPoolName?: Value<string>;
  TlsPolicy?: Value<string>;
  constructor(properties: DeliveryOptions) {
    Object.assign(this, properties);
  }
}

export class GuardianOptions {
  OptimizedSharedDelivery!: Value<string>;
  constructor(properties: GuardianOptions) {
    Object.assign(this, properties);
  }
}

export class ReputationOptions {
  ReputationMetricsEnabled?: Value<boolean>;
  constructor(properties: ReputationOptions) {
    Object.assign(this, properties);
  }
}

export class SendingOptions {
  SendingEnabled?: Value<boolean>;
  constructor(properties: SendingOptions) {
    Object.assign(this, properties);
  }
}

export class SuppressionOptions {
  SuppressedReasons?: List<Value<string>>;
  constructor(properties: SuppressionOptions) {
    Object.assign(this, properties);
  }
}

export class TrackingOptions {
  HttpsPolicy?: Value<string>;
  CustomRedirectDomain?: Value<string>;
  constructor(properties: TrackingOptions) {
    Object.assign(this, properties);
  }
}

export class VdmOptions {
  DashboardOptions?: DashboardOptions;
  GuardianOptions?: GuardianOptions;
  constructor(properties: VdmOptions) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationSetProperties {
  SendingOptions?: SendingOptions;
  SuppressionOptions?: SuppressionOptions;
  TrackingOptions?: TrackingOptions;
  ReputationOptions?: ReputationOptions;
  VdmOptions?: VdmOptions;
  DeliveryOptions?: DeliveryOptions;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ConfigurationSet extends ResourceBase<ConfigurationSetProperties> {
  static DashboardOptions = DashboardOptions;
  static DeliveryOptions = DeliveryOptions;
  static GuardianOptions = GuardianOptions;
  static ReputationOptions = ReputationOptions;
  static SendingOptions = SendingOptions;
  static SuppressionOptions = SuppressionOptions;
  static TrackingOptions = TrackingOptions;
  static VdmOptions = VdmOptions;
  constructor(properties?: ConfigurationSetProperties) {
    super('AWS::SES::ConfigurationSet', properties || {});
  }
}
