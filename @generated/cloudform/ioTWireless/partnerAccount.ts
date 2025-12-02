import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class SidewalkAccountInfo {
  AppServerPrivateKey!: Value<string>;
  constructor(properties: SidewalkAccountInfo) {
    Object.assign(this, properties);
  }
}

export class SidewalkAccountInfoWithFingerprint {
  Fingerprint?: Value<string>;
  AmazonId?: Value<string>;
  Arn?: Value<string>;
  constructor(properties: SidewalkAccountInfoWithFingerprint) {
    Object.assign(this, properties);
  }
}

export class SidewalkUpdateAccount {
  AppServerPrivateKey?: Value<string>;
  constructor(properties: SidewalkUpdateAccount) {
    Object.assign(this, properties);
  }
}
export interface PartnerAccountProperties {
  PartnerType?: Value<string>;
  SidewalkResponse?: SidewalkAccountInfoWithFingerprint;
  AccountLinked?: Value<boolean>;
  Sidewalk?: SidewalkAccountInfo;
  PartnerAccountId?: Value<string>;
  SidewalkUpdate?: SidewalkUpdateAccount;
  Tags?: List<ResourceTag>;
}
export default class PartnerAccount extends ResourceBase<PartnerAccountProperties> {
  static SidewalkAccountInfo = SidewalkAccountInfo;
  static SidewalkAccountInfoWithFingerprint = SidewalkAccountInfoWithFingerprint;
  static SidewalkUpdateAccount = SidewalkUpdateAccount;
  constructor(properties?: PartnerAccountProperties) {
    super('AWS::IoTWireless::PartnerAccount', properties || {});
  }
}
