import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AccessGrantsLocationConfiguration {
  S3SubPrefix!: Value<string>;
  constructor(properties: AccessGrantsLocationConfiguration) {
    Object.assign(this, properties);
  }
}

export class Grantee {
  GranteeType!: Value<string>;
  GranteeIdentifier!: Value<string>;
  constructor(properties: Grantee) {
    Object.assign(this, properties);
  }
}
export interface AccessGrantProperties {
  Grantee: Grantee;
  AccessGrantsLocationConfiguration?: AccessGrantsLocationConfiguration;
  ApplicationArn?: Value<string>;
  Permission: Value<string>;
  S3PrefixType?: Value<string>;
  Tags?: List<ResourceTag>;
  AccessGrantsLocationId: Value<string>;
}
export default class AccessGrant extends ResourceBase<AccessGrantProperties> {
  static AccessGrantsLocationConfiguration = AccessGrantsLocationConfiguration;
  static Grantee = Grantee;
  constructor(properties: AccessGrantProperties) {
    super('AWS::S3::AccessGrant', properties);
  }
}
