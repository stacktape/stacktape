import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Integration {
  CacheNamespace?: Value<string>;
  ConnectionType?: Value<string>;
  IntegrationResponses?: List<IntegrationResponse>;
  IntegrationHttpMethod?: Value<string>;
  Uri?: Value<string>;
  PassthroughBehavior?: Value<string>;
  RequestParameters?: { [key: string]: Value<string> };
  ConnectionId?: Value<string>;
  Type!: Value<string>;
  CacheKeyParameters?: List<Value<string>>;
  ContentHandling?: Value<string>;
  RequestTemplates?: { [key: string]: Value<string> };
  TimeoutInMillis?: Value<number>;
  Credentials?: Value<string>;
  ResponseTransferMode?: Value<string>;
  IntegrationTarget?: Value<string>;
  constructor(properties: Integration) {
    Object.assign(this, properties);
  }
}

export class IntegrationResponse {
  ResponseTemplates?: { [key: string]: Value<string> };
  SelectionPattern?: Value<string>;
  ContentHandling?: Value<string>;
  ResponseParameters?: { [key: string]: Value<string> };
  StatusCode!: Value<string>;
  constructor(properties: IntegrationResponse) {
    Object.assign(this, properties);
  }
}

export class MethodResponse {
  ResponseParameters?: { [key: string]: Value<string> };
  StatusCode!: Value<string>;
  ResponseModels?: { [key: string]: Value<string> };
  constructor(properties: MethodResponse) {
    Object.assign(this, properties);
  }
}
export interface MethodProperties {
  Integration?: Integration;
  OperationName?: Value<string>;
  RequestModels?: { [key: string]: Value<string> };
  RestApiId: Value<string>;
  AuthorizationScopes?: List<Value<string>>;
  RequestValidatorId?: Value<string>;
  RequestParameters?: { [key: string]: Value<string> };
  MethodResponses?: List<MethodResponse>;
  AuthorizerId?: Value<string>;
  ResourceId: Value<string>;
  ApiKeyRequired?: Value<boolean>;
  AuthorizationType?: Value<string>;
  HttpMethod: Value<string>;
}
export default class Method extends ResourceBase<MethodProperties> {
  static Integration = Integration;
  static IntegrationResponse = IntegrationResponse;
  static MethodResponse = MethodResponse;
  constructor(properties: MethodProperties) {
    super('AWS::ApiGateway::Method', properties);
  }
}
