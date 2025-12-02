import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ParameterConstraints {
  Required!: Value<boolean>;
  constructor(properties: ParameterConstraints) {
    Object.assign(this, properties);
  }
}
export interface RouteResponseProperties {
  RouteResponseKey: Value<string>;
  ResponseParameters?: { [key: string]: ParameterConstraints };
  RouteId: Value<string>;
  ModelSelectionExpression?: Value<string>;
  ApiId: Value<string>;
  ResponseModels?: { [key: string]: any };
}
export default class RouteResponse extends ResourceBase<RouteResponseProperties> {
  static ParameterConstraints = ParameterConstraints;
  constructor(properties: RouteResponseProperties) {
    super('AWS::ApiGatewayV2::RouteResponse', properties);
  }
}
