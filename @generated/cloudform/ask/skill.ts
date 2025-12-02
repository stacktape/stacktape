import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AuthenticationConfiguration {
  RefreshToken!: Value<string>;
  ClientSecret!: Value<string>;
  ClientId!: Value<string>;
  constructor(properties: AuthenticationConfiguration) {
    Object.assign(this, properties);
  }
}

export class Overrides {
  Manifest?: { [key: string]: any };
  constructor(properties: Overrides) {
    Object.assign(this, properties);
  }
}

export class SkillPackage {
  S3BucketRole?: Value<string>;
  S3ObjectVersion?: Value<string>;
  S3Bucket!: Value<string>;
  S3Key!: Value<string>;
  Overrides?: Overrides;
  constructor(properties: SkillPackage) {
    Object.assign(this, properties);
  }
}
export interface SkillProperties {
  AuthenticationConfiguration: AuthenticationConfiguration;
  VendorId: Value<string>;
  SkillPackage: SkillPackage;
}
export default class Skill extends ResourceBase<SkillProperties> {
  static AuthenticationConfiguration = AuthenticationConfiguration;
  static Overrides = Overrides;
  static SkillPackage = SkillPackage;
  constructor(properties: SkillProperties) {
    super('AWS::ASK::Skill', properties);
  }
}
