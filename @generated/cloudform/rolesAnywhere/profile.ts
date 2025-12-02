import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AttributeMapping {
  MappingRules!: List<MappingRule>;
  CertificateField!: Value<string>;
  constructor(properties: AttributeMapping) {
    Object.assign(this, properties);
  }
}

export class MappingRule {
  Specifier!: Value<string>;
  constructor(properties: MappingRule) {
    Object.assign(this, properties);
  }
}
export interface ProfileProperties {
  ManagedPolicyArns?: List<Value<string>>;
  RequireInstanceProperties?: Value<boolean>;
  RoleArns: List<Value<string>>;
  AcceptRoleSessionName?: Value<boolean>;
  SessionPolicy?: Value<string>;
  AttributeMappings?: List<AttributeMapping>;
  Enabled?: Value<boolean>;
  DurationSeconds?: Value<number>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Profile extends ResourceBase<ProfileProperties> {
  static AttributeMapping = AttributeMapping;
  static MappingRule = MappingRule;
  constructor(properties: ProfileProperties) {
    super('AWS::RolesAnywhere::Profile', properties);
  }
}
