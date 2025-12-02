import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ResponseParameter {
  Destination?: Value<string>;
  Source?: Value<string>;
  constructor(properties: ResponseParameter) {
    Object.assign(this, properties);
  }
}

export class ResponseParameterMap {
  ResponseParameters?: List<ResponseParameter>;
  constructor(properties: ResponseParameterMap) {
    Object.assign(this, properties);
  }
}

export class TlsConfig {
  ServerNameToVerify?: Value<string>;
  constructor(properties: TlsConfig) {
    Object.assign(this, properties);
  }
}
export interface IntegrationProperties {
  Description?: Value<string>;
  TemplateSelectionExpression?: Value<string>;
  ConnectionType?: Value<string>;
  ResponseParameters?: { [key: string]: ResponseParameterMap };
  IntegrationMethod?: Value<string>;
  PassthroughBehavior?: Value<string>;
  RequestParameters?: { [key: string]: Value<string> };
  ConnectionId?: Value<string>;
  IntegrationUri?: Value<string>;
  PayloadFormatVersion?: Value<string>;
  CredentialsArn?: Value<string>;
  RequestTemplates?: { [key: string]: Value<string> };
  TimeoutInMillis?: Value<number>;
  TlsConfig?: TlsConfig;
  ContentHandlingStrategy?: Value<string>;
  IntegrationSubtype?: Value<string>;
  ApiId: Value<string>;
  IntegrationType: Value<string>;
}
export default class Integration extends ResourceBase<IntegrationProperties> {
  static ResponseParameter = ResponseParameter;
  static ResponseParameterMap = ResponseParameterMap;
  static TlsConfig = TlsConfig;
  constructor(properties: IntegrationProperties) {
    super('AWS::ApiGatewayV2::Integration', properties);
  }
}
