import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface BasePathMappingProperties {
  DomainName: Value<string>;
  RestApiId?: Value<string>;
  Stage?: Value<string>;
  BasePath?: Value<string>;
  Id?: Value<string>;
}
export default class BasePathMapping extends ResourceBase<BasePathMappingProperties> {
  constructor(properties: BasePathMappingProperties) {
    super('AWS::ApiGateway::BasePathMapping', properties);
  }
}
