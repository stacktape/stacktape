import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomPluginFileDescription {
  FileMd5?: Value<string>;
  FileSize?: Value<number>;
  constructor(properties: CustomPluginFileDescription) {
    Object.assign(this, properties);
  }
}

export class CustomPluginLocation {
  S3Location!: S3Location;
  constructor(properties: CustomPluginLocation) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  BucketArn!: Value<string>;
  FileKey!: Value<string>;
  ObjectVersion?: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}
export interface CustomPluginProperties {
  Description?: Value<string>;
  ContentType: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
  Location: CustomPluginLocation;
}
export default class CustomPlugin extends ResourceBase<CustomPluginProperties> {
  static CustomPluginFileDescription = CustomPluginFileDescription;
  static CustomPluginLocation = CustomPluginLocation;
  static S3Location = S3Location;
  constructor(properties: CustomPluginProperties) {
    super('AWS::KafkaConnect::CustomPlugin', properties);
  }
}
