import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class SourceBundle {
  S3Bucket!: Value<string>;
  S3Key!: Value<string>;
  constructor(properties: SourceBundle) {
    Object.assign(this, properties);
  }
}
export interface ApplicationVersionProperties {
  ApplicationName: Value<string>;
  Description?: Value<string>;
  SourceBundle: SourceBundle;
}
export default class ApplicationVersion extends ResourceBase<ApplicationVersionProperties> {
  static SourceBundle = SourceBundle;
  constructor(properties: ApplicationVersionProperties) {
    super('AWS::ElasticBeanstalk::ApplicationVersion', properties);
  }
}
