import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Content {
  S3ObjectVersion?: Value<string>;
  S3Bucket!: Value<string>;
  S3Key!: Value<string>;
  constructor(properties: Content) {
    Object.assign(this, properties);
  }
}
export interface LayerVersionProperties {
  CompatibleRuntimes?: List<Value<string>>;
  LicenseInfo?: Value<string>;
  Description?: Value<string>;
  LayerName?: Value<string>;
  Content: Content;
  CompatibleArchitectures?: List<Value<string>>;
}
export default class LayerVersion extends ResourceBase<LayerVersionProperties> {
  static Content = Content;
  constructor(properties: LayerVersionProperties) {
    super('AWS::Lambda::LayerVersion', properties);
  }
}
