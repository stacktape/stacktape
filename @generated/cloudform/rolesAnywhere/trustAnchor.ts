import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class NotificationSetting {
  Channel?: Value<string>;
  Enabled!: Value<boolean>;
  Event!: Value<string>;
  Threshold?: Value<number>;
  constructor(properties: NotificationSetting) {
    Object.assign(this, properties);
  }
}

export class Source {
  SourceType!: Value<string>;
  SourceData!: SourceData;
  constructor(properties: Source) {
    Object.assign(this, properties);
  }
}

export class SourceData {
  AcmPcaArn?: Value<string>;
  X509CertificateData?: Value<string>;
  constructor(properties: SourceData) {
    Object.assign(this, properties);
  }
}
export interface TrustAnchorProperties {
  NotificationSettings?: List<NotificationSetting>;
  Enabled?: Value<boolean>;
  Source: Source;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class TrustAnchor extends ResourceBase<TrustAnchorProperties> {
  static NotificationSetting = NotificationSetting;
  static Source = Source;
  static SourceData = SourceData;
  constructor(properties: TrustAnchorProperties) {
    super('AWS::RolesAnywhere::TrustAnchor', properties);
  }
}
