import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class HttpPackageConfiguration {
  Path!: Value<string>;
  Type!: Value<string>;
  SourceGroup!: Value<string>;
  constructor(properties: HttpPackageConfiguration) {
    Object.assign(this, properties);
  }
}
export interface LiveSourceProperties {
  LiveSourceName: Value<string>;
  SourceLocationName: Value<string>;
  HttpPackageConfigurations: List<HttpPackageConfiguration>;
  Tags?: List<ResourceTag>;
}
export default class LiveSource extends ResourceBase<LiveSourceProperties> {
  static HttpPackageConfiguration = HttpPackageConfiguration;
  constructor(properties: LiveSourceProperties) {
    super('AWS::MediaTailor::LiveSource', properties);
  }
}
