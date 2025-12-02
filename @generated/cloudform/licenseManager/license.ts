import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BorrowConfiguration {
  AllowEarlyCheckIn!: Value<boolean>;
  MaxTimeToLiveInMinutes!: Value<number>;
  constructor(properties: BorrowConfiguration) {
    Object.assign(this, properties);
  }
}

export class ConsumptionConfiguration {
  BorrowConfiguration?: BorrowConfiguration;
  RenewType?: Value<string>;
  ProvisionalConfiguration?: ProvisionalConfiguration;
  constructor(properties: ConsumptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class Entitlement {
  AllowCheckIn?: Value<boolean>;
  Overage?: Value<boolean>;
  Value?: Value<string>;
  MaxCount?: Value<number>;
  Unit!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Entitlement) {
    Object.assign(this, properties);
  }
}

export class IssuerData {
  SignKey?: Value<string>;
  Name!: Value<string>;
  constructor(properties: IssuerData) {
    Object.assign(this, properties);
  }
}

export class Metadata {
  Value!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Metadata) {
    Object.assign(this, properties);
  }
}

export class ProvisionalConfiguration {
  MaxTimeToLiveInMinutes!: Value<number>;
  constructor(properties: ProvisionalConfiguration) {
    Object.assign(this, properties);
  }
}

export class ValidityDateFormat {
  Begin!: Value<string>;
  End!: Value<string>;
  constructor(properties: ValidityDateFormat) {
    Object.assign(this, properties);
  }
}
export interface LicenseProperties {
  ProductSKU?: Value<string>;
  Status?: Value<string>;
  ConsumptionConfiguration: ConsumptionConfiguration;
  Validity: ValidityDateFormat;
  ProductName: Value<string>;
  Issuer: IssuerData;
  HomeRegion: Value<string>;
  Entitlements: List<Entitlement>;
  LicenseMetadata?: List<Metadata>;
  LicenseName: Value<string>;
  Beneficiary?: Value<string>;
}
export default class License extends ResourceBase<LicenseProperties> {
  static BorrowConfiguration = BorrowConfiguration;
  static ConsumptionConfiguration = ConsumptionConfiguration;
  static Entitlement = Entitlement;
  static IssuerData = IssuerData;
  static Metadata = Metadata;
  static ProvisionalConfiguration = ProvisionalConfiguration;
  static ValidityDateFormat = ValidityDateFormat;
  constructor(properties: LicenseProperties) {
    super('AWS::LicenseManager::License', properties);
  }
}
