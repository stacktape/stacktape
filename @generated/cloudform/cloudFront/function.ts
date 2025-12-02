import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class FunctionConfig {
  Comment!: Value<string>;
  Runtime!: Value<string>;
  KeyValueStoreAssociations?: List<KeyValueStoreAssociation>;
  constructor(properties: FunctionConfig) {
    Object.assign(this, properties);
  }
}

export class FunctionMetadata {
  FunctionARN?: Value<string>;
  constructor(properties: FunctionMetadata) {
    Object.assign(this, properties);
  }
}

export class KeyValueStoreAssociation {
  KeyValueStoreARN!: Value<string>;
  constructor(properties: KeyValueStoreAssociation) {
    Object.assign(this, properties);
  }
}
export interface FunctionProperties {
  FunctionConfig: FunctionConfig;
  FunctionMetadata?: FunctionMetadata;
  AutoPublish?: Value<boolean>;
  FunctionCode: Value<string>;
  Name: Value<string>;
}
export default class Function extends ResourceBase<FunctionProperties> {
  static FunctionConfig = FunctionConfig;
  static FunctionMetadata = FunctionMetadata;
  static KeyValueStoreAssociation = KeyValueStoreAssociation;
  constructor(properties: FunctionProperties) {
    super('AWS::CloudFront::Function', properties);
  }
}
