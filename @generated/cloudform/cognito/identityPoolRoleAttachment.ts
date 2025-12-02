import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class MappingRule {
  MatchType!: Value<string>;
  Value!: Value<string>;
  Claim!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: MappingRule) {
    Object.assign(this, properties);
  }
}

export class RoleMapping {
  Type!: Value<string>;
  AmbiguousRoleResolution?: Value<string>;
  RulesConfiguration?: RulesConfigurationType;
  IdentityProvider?: Value<string>;
  constructor(properties: RoleMapping) {
    Object.assign(this, properties);
  }
}

export class RulesConfigurationType {
  Rules!: List<MappingRule>;
  constructor(properties: RulesConfigurationType) {
    Object.assign(this, properties);
  }
}
export interface IdentityPoolRoleAttachmentProperties {
  RoleMappings?: { [key: string]: RoleMapping };
  IdentityPoolId: Value<string>;
  Roles?: { [key: string]: Value<string> };
}
export default class IdentityPoolRoleAttachment extends ResourceBase<IdentityPoolRoleAttachmentProperties> {
  static MappingRule = MappingRule;
  static RoleMapping = RoleMapping;
  static RulesConfigurationType = RulesConfigurationType;
  constructor(properties: IdentityPoolRoleAttachmentProperties) {
    super('AWS::Cognito::IdentityPoolRoleAttachment', properties);
  }
}
