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
  DeploymentId?: Value<string>;
  StageVariableOverrides?: { [key: string]: Value<string> };
  PercentTraffic?: Value<number>;
  UseStageCache?: Value<boolean>;
  constructor(properties: CanarySetting) {
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
export interface StageProperties {
  DeploymentId?: Value<string>;
  Description?: Value<string>;
  StageName?: Value<string>;
  RestApiId: Value<string>;
  CanarySetting?: CanarySetting;
  ClientCertificateId?: Value<string>;
  Variables?: { [key: string]: Value<string> };
  DocumentationVersion?: Value<string>;
  TracingEnabled?: Value<boolean>;
  MethodSettings?: List<MethodSetting>;
  AccessLogSetting?: AccessLogSetting;
  CacheClusterSize?: Value<string>;
  Tags?: List<ResourceTag>;
  CacheClusterEnabled?: Value<boolean>;
}
export default class Stage extends ResourceBase<StageProperties> {
  static AccessLogSetting = AccessLogSetting;
  static CanarySetting = CanarySetting;
  static MethodSetting = MethodSetting;
  constructor(properties: StageProperties) {
    super('AWS::ApiGateway::Stage', properties);
  }
}
