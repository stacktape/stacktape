import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BodyS3Location {
  Etag?: Value<string>;
  Bucket?: Value<string>;
  Version?: Value<string>;
  Key?: Value<string>;
  constructor(properties: BodyS3Location) {
    Object.assign(this, properties);
  }
}

export class Cors {
  AllowOrigins?: List<Value<string>>;
  AllowCredentials?: Value<boolean>;
  ExposeHeaders?: List<Value<string>>;
  AllowHeaders?: List<Value<string>>;
  MaxAge?: Value<number>;
  AllowMethods?: List<Value<string>>;
  constructor(properties: Cors) {
    Object.assign(this, properties);
  }
}
export interface ApiProperties {
  IpAddressType?: Value<string>;
  RouteSelectionExpression?: Value<string>;
  BodyS3Location?: BodyS3Location;
  Description?: Value<string>;
  BasePath?: Value<string>;
  FailOnWarnings?: Value<boolean>;
  DisableExecuteApiEndpoint?: Value<boolean>;
  DisableSchemaValidation?: Value<boolean>;
  Name?: Value<string>;
  Target?: Value<string>;
  CredentialsArn?: Value<string>;
  CorsConfiguration?: Cors;
  Version?: Value<string>;
  ProtocolType?: Value<string>;
  RouteKey?: Value<string>;
  Body?: { [key: string]: any };
  Tags?: { [key: string]: Value<string> };
  ApiKeySelectionExpression?: Value<string>;
}
export default class Api extends ResourceBase<ApiProperties> {
  static BodyS3Location = BodyS3Location;
  static Cors = Cors;
  constructor(properties?: ApiProperties) {
    super('AWS::ApiGatewayV2::Api', properties || {});
  }
}
