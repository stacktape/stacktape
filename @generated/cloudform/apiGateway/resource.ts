import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ResourceProperties {
  ParentId: Value<string>;
  PathPart: Value<string>;
  RestApiId: Value<string>;
}
export default class Resource extends ResourceBase<ResourceProperties> {
  constructor(properties: ResourceProperties) {
    super('AWS::ApiGateway::Resource', properties);
  }
}
