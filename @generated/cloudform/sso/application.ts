import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class PortalOptionsConfiguration {
  SignInOptions?: SignInOptions;
  Visibility?: Value<string>;
  constructor(properties: PortalOptionsConfiguration) {
    Object.assign(this, properties);
  }
}

export class SignInOptions {
  Origin!: Value<string>;
  ApplicationUrl?: Value<string>;
  constructor(properties: SignInOptions) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  Status?: Value<string>;
  ApplicationProviderArn: Value<string>;
  PortalOptions?: PortalOptionsConfiguration;
  Description?: Value<string>;
  InstanceArn: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static PortalOptionsConfiguration = PortalOptionsConfiguration;
  static SignInOptions = SignInOptions;
  constructor(properties: ApplicationProperties) {
    super('AWS::SSO::Application', properties);
  }
}
