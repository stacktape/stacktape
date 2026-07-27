import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ArchivingOptions {
  ArchiveArn?: Value<string>;
  constructor(properties: ArchivingOptions) {
    Object.assign(this, properties);
  }
}

export class ConditionThreshold {
  OverallConfidenceThreshold?: OverallConfidenceThreshold;
  ConditionThresholdEnabled!: Value<string>;
  constructor(properties: ConditionThreshold) {
    Object.assign(this, properties);
  }
}

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

export class OverallConfidenceThreshold {
  ConfidenceVerdictThreshold!: Value<string>;
  constructor(properties: OverallConfidenceThreshold) {
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
  ValidationOptions?: ValidationOptions;
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

export class ValidationOptions {
  ConditionThreshold!: ConditionThreshold;
  constructor(properties: ValidationOptions) {
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
  ArchivingOptions?: ArchivingOptions;
  DeliveryOptions?: DeliveryOptions;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ConfigurationSet extends ResourceBase<ConfigurationSetProperties> {
  static ArchivingOptions = ArchivingOptions;
  static ConditionThreshold = ConditionThreshold;
  static DashboardOptions = DashboardOptions;
  static DeliveryOptions = DeliveryOptions;
  static GuardianOptions = GuardianOptions;
  static OverallConfidenceThreshold = OverallConfidenceThreshold;
  static ReputationOptions = ReputationOptions;
  static SendingOptions = SendingOptions;
  static SuppressionOptions = SuppressionOptions;
  static TrackingOptions = TrackingOptions;
  static ValidationOptions = ValidationOptions;
  static VdmOptions = VdmOptions;
  constructor(properties?: ConfigurationSetProperties) {
    super('AWS::SES::ConfigurationSet', properties || {});
  }
}
