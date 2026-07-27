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
export interface VodSourceProperties {
  VodSourceName: Value<string>;
  SourceLocationName: Value<string>;
  HttpPackageConfigurations: List<HttpPackageConfiguration>;
  Tags?: List<ResourceTag>;
}
export default class VodSource extends ResourceBase<VodSourceProperties> {
  static HttpPackageConfiguration = HttpPackageConfiguration;
  constructor(properties: VodSourceProperties) {
    super('AWS::MediaTailor::VodSource', properties);
  }
}
