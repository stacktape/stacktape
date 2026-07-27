import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class IamFederationConfigOptions {
  UserAttribute?: Value<string>;
  GroupAttribute?: Value<string>;
  constructor(properties: IamFederationConfigOptions) {
    Object.assign(this, properties);
  }
}

export class IamIdentityCenterConfigOptions {
  ApplicationArn?: Value<string>;
  ApplicationName?: Value<string>;
  UserAttribute?: Value<string>;
  InstanceArn!: Value<string>;
  ApplicationDescription?: Value<string>;
  GroupAttribute?: Value<string>;
  constructor(properties: IamIdentityCenterConfigOptions) {
    Object.assign(this, properties);
  }
}

export class SamlConfigOptions {
  SessionTimeout?: Value<number>;
  OpenSearchServerlessEntityId?: Value<string>;
  UserAttribute?: Value<string>;
  Metadata!: Value<string>;
  GroupAttribute?: Value<string>;
  constructor(properties: SamlConfigOptions) {
    Object.assign(this, properties);
  }
}
export interface SecurityConfigProperties {
  Type?: Value<string>;
  Description?: Value<string>;
  SamlOptions?: SamlConfigOptions;
  IamFederationOptions?: IamFederationConfigOptions;
  Name?: Value<string>;
  IamIdentityCenterOptions?: IamIdentityCenterConfigOptions;
}
export default class SecurityConfig extends ResourceBase<SecurityConfigProperties> {
  static IamFederationConfigOptions = IamFederationConfigOptions;
  static IamIdentityCenterConfigOptions = IamIdentityCenterConfigOptions;
  static SamlConfigOptions = SamlConfigOptions;
  constructor(properties?: SecurityConfigProperties) {
    super('AWS::OpenSearchServerless::SecurityConfig', properties || {});
  }
}
