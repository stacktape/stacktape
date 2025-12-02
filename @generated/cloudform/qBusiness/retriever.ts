import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class KendraIndexConfiguration {
  IndexId!: Value<string>;
  constructor(properties: KendraIndexConfiguration) {
    Object.assign(this, properties);
  }
}

export class NativeIndexConfiguration {
  IndexId!: Value<string>;
  constructor(properties: NativeIndexConfiguration) {
    Object.assign(this, properties);
  }
}

export class RetrieverConfiguration {
  KendraIndexConfiguration?: KendraIndexConfiguration;
  NativeIndexConfiguration?: NativeIndexConfiguration;
  constructor(properties: RetrieverConfiguration) {
    Object.assign(this, properties);
  }
}
export interface RetrieverProperties {
  Type: Value<string>;
  Configuration: RetrieverConfiguration;
  DisplayName: Value<string>;
  ApplicationId: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Retriever extends ResourceBase<RetrieverProperties> {
  static KendraIndexConfiguration = KendraIndexConfiguration;
  static NativeIndexConfiguration = NativeIndexConfiguration;
  static RetrieverConfiguration = RetrieverConfiguration;
  constructor(properties: RetrieverProperties) {
    super('AWS::QBusiness::Retriever', properties);
  }
}
