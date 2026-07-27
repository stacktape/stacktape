import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfiguration {
  Type!: Value<string>;
  KmsKeyId?: Value<string>;
  KmsDataKeyReusePeriodSeconds?: Value<number>;
  constructor(properties: EncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class TagsEntry {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: TagsEntry) {
    Object.assign(this, properties);
  }
}
export interface ActivityProperties {
  EncryptionConfiguration?: EncryptionConfiguration;
  Tags?: List<TagsEntry>;
  Name: Value<string>;
}
export default class Activity extends ResourceBase<ActivityProperties> {
  static EncryptionConfiguration = EncryptionConfiguration;
  static TagsEntry = TagsEntry;
  constructor(properties: ActivityProperties) {
    super('AWS::StepFunctions::Activity', properties);
  }
}
