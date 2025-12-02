import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class StageKey {
  StageName?: Value<string>;
  RestApiId?: Value<string>;
  constructor(properties: StageKey) {
    Object.assign(this, properties);
  }
}
export interface ApiKeyProperties {
  Description?: Value<string>;
  StageKeys?: List<StageKey>;
  Value?: Value<string>;
  Enabled?: Value<boolean>;
  CustomerId?: Value<string>;
  GenerateDistinctId?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ApiKey extends ResourceBase<ApiKeyProperties> {
  static StageKey = StageKey;
  constructor(properties?: ApiKeyProperties) {
    super('AWS::ApiGateway::ApiKey', properties || {});
  }
}
