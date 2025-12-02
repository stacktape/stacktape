import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessLogSettings {
  Format?: Value<string>;
  DestinationArn?: Value<string>;
  constructor(properties: AccessLogSettings) {
    Object.assign(this, properties);
  }
}

export class IntegrationOverrides {
  Description?: Value<string>;
  PayloadFormatVersion?: Value<string>;
  TimeoutInMillis?: Value<number>;
  IntegrationMethod?: Value<string>;
  constructor(properties: IntegrationOverrides) {
    Object.assign(this, properties);
  }
}

export class RouteOverrides {
  Target?: Value<string>;
  AuthorizerId?: Value<string>;
  OperationName?: Value<string>;
  AuthorizationScopes?: List<Value<string>>;
  AuthorizationType?: Value<string>;
  constructor(properties: RouteOverrides) {
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

export class StageOverrides {
  Description?: Value<string>;
  AccessLogSettings?: AccessLogSettings;
  AutoDeploy?: Value<boolean>;
  RouteSettings?: { [key: string]: any };
  StageVariables?: { [key: string]: any };
  DefaultRouteSettings?: RouteSettings;
  constructor(properties: StageOverrides) {
    Object.assign(this, properties);
  }
}
export interface ApiGatewayManagedOverridesProperties {
  Integration?: IntegrationOverrides;
  Stage?: StageOverrides;
  ApiId: Value<string>;
  Route?: RouteOverrides;
}
export default class ApiGatewayManagedOverrides extends ResourceBase<ApiGatewayManagedOverridesProperties> {
  static AccessLogSettings = AccessLogSettings;
  static IntegrationOverrides = IntegrationOverrides;
  static RouteOverrides = RouteOverrides;
  static RouteSettings = RouteSettings;
  static StageOverrides = StageOverrides;
  constructor(properties: ApiGatewayManagedOverridesProperties) {
    super('AWS::ApiGatewayV2::ApiGatewayManagedOverrides', properties);
  }
}
