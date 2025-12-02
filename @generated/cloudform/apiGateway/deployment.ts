import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessLogSetting {
  Format?: Value<string>;
  DestinationArn?: Value<string>;
  constructor(properties: AccessLogSetting) {
    Object.assign(this, properties);
  }
}

export class CanarySetting {
  StageVariableOverrides?: { [key: string]: Value<string> };
  PercentTraffic?: Value<number>;
  UseStageCache?: Value<boolean>;
  constructor(properties: CanarySetting) {
    Object.assign(this, properties);
  }
}

export class DeploymentCanarySettings {
  StageVariableOverrides?: { [key: string]: Value<string> };
  PercentTraffic?: Value<number>;
  UseStageCache?: Value<boolean>;
  constructor(properties: DeploymentCanarySettings) {
    Object.assign(this, properties);
  }
}

export class MethodSetting {
  CacheTtlInSeconds?: Value<number>;
  LoggingLevel?: Value<string>;
  ResourcePath?: Value<string>;
  CacheDataEncrypted?: Value<boolean>;
  DataTraceEnabled?: Value<boolean>;
  ThrottlingBurstLimit?: Value<number>;
  CachingEnabled?: Value<boolean>;
  MetricsEnabled?: Value<boolean>;
  HttpMethod?: Value<string>;
  ThrottlingRateLimit?: Value<number>;
  constructor(properties: MethodSetting) {
    Object.assign(this, properties);
  }
}

export class StageDescription {
  CacheTtlInSeconds?: Value<number>;
  Description?: Value<string>;
  LoggingLevel?: Value<string>;
  CanarySetting?: CanarySetting;
  ThrottlingRateLimit?: Value<number>;
  ClientCertificateId?: Value<string>;
  Variables?: { [key: string]: Value<string> };
  DocumentationVersion?: Value<string>;
  CacheDataEncrypted?: Value<boolean>;
  DataTraceEnabled?: Value<boolean>;
  ThrottlingBurstLimit?: Value<number>;
  CachingEnabled?: Value<boolean>;
  TracingEnabled?: Value<boolean>;
  MethodSettings?: List<MethodSetting>;
  AccessLogSetting?: AccessLogSetting;
  CacheClusterSize?: Value<string>;
  MetricsEnabled?: Value<boolean>;
  Tags?: List<ResourceTag>;
  CacheClusterEnabled?: Value<boolean>;
  constructor(properties: StageDescription) {
    Object.assign(this, properties);
  }
}
export interface DeploymentProperties {
  Description?: Value<string>;
  StageDescription?: StageDescription;
  StageName?: Value<string>;
  RestApiId: Value<string>;
  DeploymentCanarySettings?: DeploymentCanarySettings;
}
export default class Deployment extends ResourceBase<DeploymentProperties> {
  static AccessLogSetting = AccessLogSetting;
  static CanarySetting = CanarySetting;
  static DeploymentCanarySettings = DeploymentCanarySettings;
  static MethodSetting = MethodSetting;
  static StageDescription = StageDescription;
  constructor(properties: DeploymentProperties) {
    super('AWS::ApiGateway::Deployment', properties);
  }
}
