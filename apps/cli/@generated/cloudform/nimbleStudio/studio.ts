import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class StudioEncryptionConfiguration {
  KeyType!: Value<string>;
  KeyArn?: Value<string>;
  constructor(properties: StudioEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface StudioProperties {
  UserRoleArn: Value<string>;
  DisplayName: Value<string>;
  StudioName: Value<string>;
  AdminRoleArn: Value<string>;
  StudioEncryptionConfiguration?: StudioEncryptionConfiguration;
  Tags?: { [key: string]: Value<string> };
}
export default class Studio extends ResourceBase<StudioProperties> {
  static StudioEncryptionConfiguration = StudioEncryptionConfiguration;
  constructor(properties: StudioProperties) {
    super('AWS::NimbleStudio::Studio', properties);
  }
}
