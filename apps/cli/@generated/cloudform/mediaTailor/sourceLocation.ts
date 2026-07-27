import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessConfiguration {
  SecretsManagerAccessTokenConfiguration?: SecretsManagerAccessTokenConfiguration;
  AccessType?: Value<string>;
  constructor(properties: AccessConfiguration) {
    Object.assign(this, properties);
  }
}

export class DefaultSegmentDeliveryConfiguration {
  BaseUrl?: Value<string>;
  constructor(properties: DefaultSegmentDeliveryConfiguration) {
    Object.assign(this, properties);
  }
}

export class HttpConfiguration {
  BaseUrl!: Value<string>;
  constructor(properties: HttpConfiguration) {
    Object.assign(this, properties);
  }
}

export class SecretsManagerAccessTokenConfiguration {
  SecretArn?: Value<string>;
  HeaderName?: Value<string>;
  SecretStringKey?: Value<string>;
  constructor(properties: SecretsManagerAccessTokenConfiguration) {
    Object.assign(this, properties);
  }
}

export class SegmentDeliveryConfiguration {
  BaseUrl?: Value<string>;
  Name?: Value<string>;
  constructor(properties: SegmentDeliveryConfiguration) {
    Object.assign(this, properties);
  }
}
export interface SourceLocationProperties {
  SourceLocationName: Value<string>;
  DefaultSegmentDeliveryConfiguration?: DefaultSegmentDeliveryConfiguration;
  SegmentDeliveryConfigurations?: List<SegmentDeliveryConfiguration>;
  HttpConfiguration: HttpConfiguration;
  AccessConfiguration?: AccessConfiguration;
  Tags?: List<ResourceTag>;
}
export default class SourceLocation extends ResourceBase<SourceLocationProperties> {
  static AccessConfiguration = AccessConfiguration;
  static DefaultSegmentDeliveryConfiguration = DefaultSegmentDeliveryConfiguration;
  static HttpConfiguration = HttpConfiguration;
  static SecretsManagerAccessTokenConfiguration = SecretsManagerAccessTokenConfiguration;
  static SegmentDeliveryConfiguration = SegmentDeliveryConfiguration;
  constructor(properties: SourceLocationProperties) {
    super('AWS::MediaTailor::SourceLocation', properties);
  }
}
