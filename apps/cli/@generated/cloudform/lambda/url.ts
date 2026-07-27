import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Cors {
  AllowCredentials?: Value<boolean>;
  AllowOrigins?: List<Value<string>>;
  ExposeHeaders?: List<Value<string>>;
  AllowHeaders?: List<Value<string>>;
  MaxAge?: Value<number>;
  AllowMethods?: List<Value<string>>;
  constructor(properties: Cors) {
    Object.assign(this, properties);
  }
}
export interface UrlProperties {
  Qualifier?: Value<string>;
  InvokeMode?: Value<string>;
  AuthType: Value<string>;
  TargetFunctionArn: Value<string>;
  Cors?: Cors;
}
export default class Url extends ResourceBase<UrlProperties> {
  static Cors = Cors;
  constructor(properties: UrlProperties) {
    super('AWS::Lambda::Url', properties);
  }
}
