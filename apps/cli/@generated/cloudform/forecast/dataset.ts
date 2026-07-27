import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributesItems {
  AttributeType?: Value<string>;
  AttributeName?: Value<string>;
  constructor(properties: AttributesItems) {
    Object.assign(this, properties);
  }
}

export class EncryptionConfig {
  KmsKeyArn?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: EncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class Schema {
  Attributes?: List<AttributesItems>;
  constructor(properties: Schema) {
    Object.assign(this, properties);
  }
}

export class TagsItems {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsItems) {
    Object.assign(this, properties);
  }
}
export interface DatasetProperties {
  DataFrequency?: Value<string>;
  DatasetName: Value<string>;
  Schema: Schema;
  DatasetType: Value<string>;
  Domain: Value<string>;
  EncryptionConfig?: EncryptionConfig;
  Tags?: List<TagsItems>;
}
export default class Dataset extends ResourceBase<DatasetProperties> {
  static AttributesItems = AttributesItems;
  static EncryptionConfig = EncryptionConfig;
  static Schema = Schema;
  static TagsItems = TagsItems;
  constructor(properties: DatasetProperties) {
    super('AWS::Forecast::Dataset', properties);
  }
}
