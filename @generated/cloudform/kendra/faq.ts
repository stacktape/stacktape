import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class S3Path {
  Bucket!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Path) {
    Object.assign(this, properties);
  }
}
export interface FaqProperties {
  IndexId: Value<string>;
  LanguageCode?: Value<string>;
  Description?: Value<string>;
  S3Path: S3Path;
  FileFormat?: Value<string>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Faq extends ResourceBase<FaqProperties> {
  static S3Path = S3Path;
  constructor(properties: FaqProperties) {
    super('AWS::Kendra::Faq', properties);
  }
}
