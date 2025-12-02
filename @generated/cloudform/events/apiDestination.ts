import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ApiDestinationProperties {
  Description?: Value<string>;
  ConnectionArn: Value<string>;
  InvocationEndpoint: Value<string>;
  HttpMethod: Value<string>;
  Name?: Value<string>;
  InvocationRateLimitPerSecond?: Value<number>;
}
export default class ApiDestination extends ResourceBase<ApiDestinationProperties> {
  constructor(properties: ApiDestinationProperties) {
    super('AWS::Events::ApiDestination', properties);
  }
}
