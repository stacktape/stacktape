import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ManifestOverridesPayload {
  PayloadData?: Value<string>;
  constructor(properties: ManifestOverridesPayload) {
    Object.assign(this, properties);
  }
}

export class ManifestPayload {
  PayloadData?: Value<string>;
  constructor(properties: ManifestPayload) {
    Object.assign(this, properties);
  }
}
export interface ApplicationInstanceProperties {
  DefaultRuntimeContextDevice: Value<string>;
  Description?: Value<string>;
  ApplicationInstanceIdToReplace?: Value<string>;
  ManifestOverridesPayload?: ManifestOverridesPayload;
  RuntimeRoleArn?: Value<string>;
  ManifestPayload: ManifestPayload;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ApplicationInstance extends ResourceBase<ApplicationInstanceProperties> {
  static ManifestOverridesPayload = ManifestOverridesPayload;
  static ManifestPayload = ManifestPayload;
  constructor(properties: ApplicationInstanceProperties) {
    super('AWS::Panorama::ApplicationInstance', properties);
  }
}
