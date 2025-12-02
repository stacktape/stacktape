import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface ApiKeyProperties {
  Description?: Value<string>;
  ApiKeyId?: Value<string>;
  Expires?: Value<number>;
  ApiId: Value<string>;
}
export default class ApiKey extends ResourceBase<ApiKeyProperties> {
  constructor(properties: ApiKeyProperties) {
    super('AWS::AppSync::ApiKey', properties);
  }
}
