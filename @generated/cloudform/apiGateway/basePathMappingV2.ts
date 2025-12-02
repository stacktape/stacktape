import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface BasePathMappingV2Properties {
  DomainNameArn: Value<string>;
  RestApiId: Value<string>;
  Stage?: Value<string>;
  BasePath?: Value<string>;
}
export default class BasePathMappingV2 extends ResourceBase<BasePathMappingV2Properties> {
  constructor(properties: BasePathMappingV2Properties) {
    super('AWS::ApiGateway::BasePathMappingV2', properties);
  }
}
