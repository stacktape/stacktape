import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessLogSettings {
  Format?: Value<string>;
  DestinationArn?: Value<string>;
  constructor(properties: AccessLogSettings) {
    Object.assign(this, properties);
  }
}

export class RouteSettings {
  LoggingLevel?: Value<string>;
  DataTraceEnabled?: Value<boolean>;
  ThrottlingBurstLimit?: Value<number>;
  DetailedMetricsEnabled?: Value<boolean>;
  ThrottlingRateLimit?: Value<number>;
  constructor(properties: RouteSettings) {
    Object.assign(this, properties);
  }
}
export interface StageProperties {
  ClientCertificateId?: Value<string>;
  DeploymentId?: Value<string>;
  Description?: Value<string>;
  AccessLogSettings?: AccessLogSettings;
  AutoDeploy?: Value<boolean>;
  RouteSettings?: { [key: string]: any };
  StageName: Value<string>;
  StageVariables?: { [key: string]: any };
  AccessPolicyId?: Value<string>;
  ApiId: Value<string>;
  DefaultRouteSettings?: RouteSettings;
  Tags?: { [key: string]: any };
}
export default class Stage extends ResourceBase<StageProperties> {
  static AccessLogSettings = AccessLogSettings;
  static RouteSettings = RouteSettings;
  constructor(properties: StageProperties) {
    super('AWS::ApiGatewayV2::Stage', properties);
  }
}
