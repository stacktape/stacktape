import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Certificate {
  Arn?: Value<string>;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}

export class Customizations {
  WebAcl?: WebAclCustomization;
  GeoRestrictions?: GeoRestrictionCustomization;
  Certificate?: Certificate;
  constructor(properties: Customizations) {
    Object.assign(this, properties);
  }
}

export class DomainResult {
  Status?: Value<string>;
  Domain?: Value<string>;
  constructor(properties: DomainResult) {
    Object.assign(this, properties);
  }
}

export class GeoRestrictionCustomization {
  Locations?: List<Value<string>>;
  RestrictionType?: Value<string>;
  constructor(properties: GeoRestrictionCustomization) {
    Object.assign(this, properties);
  }
}

export class ManagedCertificateRequest {
  CertificateTransparencyLoggingPreference?: Value<string>;
  ValidationTokenHost?: Value<string>;
  PrimaryDomainName?: Value<string>;
  constructor(properties: ManagedCertificateRequest) {
    Object.assign(this, properties);
  }
}

export class Parameter {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: Parameter) {
    Object.assign(this, properties);
  }
}

export class WebAclCustomization {
  Action?: Value<string>;
  Arn?: Value<string>;
  constructor(properties: WebAclCustomization) {
    Object.assign(this, properties);
  }
}
export interface DistributionTenantProperties {
  Domains: List<Value<string>>;
  Parameters?: List<Parameter>;
  Customizations?: Customizations;
  Enabled?: Value<boolean>;
  ManagedCertificateRequest?: ManagedCertificateRequest;
  DistributionId: Value<string>;
  ConnectionGroupId?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DistributionTenant extends ResourceBase<DistributionTenantProperties> {
  static Certificate = Certificate;
  static Customizations = Customizations;
  static DomainResult = DomainResult;
  static GeoRestrictionCustomization = GeoRestrictionCustomization;
  static ManagedCertificateRequest = ManagedCertificateRequest;
  static Parameter = Parameter;
  static WebAclCustomization = WebAclCustomization;
  constructor(properties: DistributionTenantProperties) {
    super('AWS::CloudFront::DistributionTenant', properties);
  }
}
