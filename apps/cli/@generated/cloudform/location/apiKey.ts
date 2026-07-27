import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AndroidApp {
  CertificateFingerprint!: Value<string>;
  Package!: Value<string>;
  constructor(properties: AndroidApp) {
    Object.assign(this, properties);
  }
}

export class ApiKeyRestrictions {
  AllowActions!: List<Value<string>>;
  AllowResources!: List<Value<string>>;
  AllowAndroidApps?: List<AndroidApp>;
  AllowReferers?: List<Value<string>>;
  AllowAppleApps?: List<AppleApp>;
  constructor(properties: ApiKeyRestrictions) {
    Object.assign(this, properties);
  }
}

export class AppleApp {
  BundleId!: Value<string>;
  constructor(properties: AppleApp) {
    Object.assign(this, properties);
  }
}
export interface APIKeyProperties {
  KeyName: Value<string>;
  Description?: Value<string>;
  NoExpiry?: Value<boolean>;
  ForceDelete?: Value<boolean>;
  ExpireTime?: Value<string>;
  ForceUpdate?: Value<boolean>;
  Restrictions: ApiKeyRestrictions;
  Tags?: List<ResourceTag>;
}
export default class APIKey extends ResourceBase<APIKeyProperties> {
  static AndroidApp = AndroidApp;
  static ApiKeyRestrictions = ApiKeyRestrictions;
  static AppleApp = AppleApp;
  constructor(properties: APIKeyProperties) {
    super('AWS::Location::APIKey', properties);
  }
}
