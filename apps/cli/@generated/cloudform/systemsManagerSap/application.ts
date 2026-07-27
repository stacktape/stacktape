import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ComponentInfo {
  Ec2InstanceId?: Value<string>;
  ComponentType?: Value<string>;
  Sid?: Value<string>;
  constructor(properties: ComponentInfo) {
    Object.assign(this, properties);
  }
}

export class Credential {
  SecretId?: Value<string>;
  DatabaseName?: Value<string>;
  CredentialType?: Value<string>;
  constructor(properties: Credential) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  Instances?: List<Value<string>>;
  ApplicationType: Value<string>;
  DatabaseArn?: Value<string>;
  SapInstanceNumber?: Value<string>;
  ApplicationId: Value<string>;
  Credentials?: List<Credential>;
  Tags?: List<ResourceTag>;
  ComponentsInfo?: List<ComponentInfo>;
  Sid?: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static ComponentInfo = ComponentInfo;
  static Credential = Credential;
  constructor(properties: ApplicationProperties) {
    super('AWS::SystemsManagerSAP::Application', properties);
  }
}
