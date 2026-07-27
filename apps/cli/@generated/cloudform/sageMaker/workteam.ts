import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CognitoMemberDefinition {
  CognitoUserPool!: Value<string>;
  CognitoClientId!: Value<string>;
  CognitoUserGroup!: Value<string>;
  constructor(properties: CognitoMemberDefinition) {
    Object.assign(this, properties);
  }
}

export class MemberDefinition {
  OidcMemberDefinition?: OidcMemberDefinition;
  CognitoMemberDefinition?: CognitoMemberDefinition;
  constructor(properties: MemberDefinition) {
    Object.assign(this, properties);
  }
}

export class NotificationConfiguration {
  NotificationTopicArn!: Value<string>;
  constructor(properties: NotificationConfiguration) {
    Object.assign(this, properties);
  }
}

export class OidcMemberDefinition {
  OidcGroups!: List<Value<string>>;
  constructor(properties: OidcMemberDefinition) {
    Object.assign(this, properties);
  }
}
export interface WorkteamProperties {
  Description?: Value<string>;
  NotificationConfiguration?: NotificationConfiguration;
  WorkteamName?: Value<string>;
  MemberDefinitions?: List<MemberDefinition>;
  WorkforceName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Workteam extends ResourceBase<WorkteamProperties> {
  static CognitoMemberDefinition = CognitoMemberDefinition;
  static MemberDefinition = MemberDefinition;
  static NotificationConfiguration = NotificationConfiguration;
  static OidcMemberDefinition = OidcMemberDefinition;
  constructor(properties?: WorkteamProperties) {
    super('AWS::SageMaker::Workteam', properties || {});
  }
}
