import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LambdaEndpointInput {
  Arn!: Value<string>;
  constructor(properties: LambdaEndpointInput) {
    Object.assign(this, properties);
  }
}

export class UrlEndpointInput {
  HealthUrl?: Value<string>;
  Url!: Value<string>;
  constructor(properties: UrlEndpointInput) {
    Object.assign(this, properties);
  }
}
export interface ServiceProperties {
  LambdaEndpoint?: LambdaEndpointInput;
  UrlEndpoint?: UrlEndpointInput;
  Description?: Value<string>;
  EnvironmentIdentifier: Value<string>;
  VpcId?: Value<string>;
  EndpointType: Value<string>;
  ApplicationIdentifier: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Service extends ResourceBase<ServiceProperties> {
  static LambdaEndpointInput = LambdaEndpointInput;
  static UrlEndpointInput = UrlEndpointInput;
  constructor(properties: ServiceProperties) {
    super('AWS::RefactorSpaces::Service', properties);
  }
}
