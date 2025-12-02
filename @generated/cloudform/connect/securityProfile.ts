import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Application {
  ApplicationPermissions!: List<Value<string>>;
  Namespace!: Value<string>;
  constructor(properties: Application) {
    Object.assign(this, properties);
  }
}
export interface SecurityProfileProperties {
  Description?: Value<string>;
  AllowedAccessControlTags?: List<ResourceTag>;
  Applications?: List<Application>;
  AllowedAccessControlHierarchyGroupId?: Value<string>;
  InstanceArn: Value<string>;
  Permissions?: List<Value<string>>;
  SecurityProfileName: Value<string>;
  TagRestrictedResources?: List<Value<string>>;
  Tags?: List<ResourceTag>;
  HierarchyRestrictedResources?: List<Value<string>>;
}
export default class SecurityProfile extends ResourceBase<SecurityProfileProperties> {
  static Application = Application;
  constructor(properties: SecurityProfileProperties) {
    super('AWS::Connect::SecurityProfile', properties);
  }
}
