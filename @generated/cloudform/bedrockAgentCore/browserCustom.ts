import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BrowserEnterprisePolicy {
  Type!: Value<string>;
  Location!: S3Location;
  constructor(properties: BrowserEnterprisePolicy) {
    Object.assign(this, properties);
  }
}

export class BrowserNetworkConfiguration {
  VpcConfig?: VpcConfig;
  NetworkMode!: Value<string>;
  constructor(properties: BrowserNetworkConfiguration) {
    Object.assign(this, properties);
  }
}

export class BrowserSigning {
  Enabled?: Value<boolean>;
  constructor(properties: BrowserSigning) {
    Object.assign(this, properties);
  }
}

export class Certificate {
  CertificateLocation!: CertificateLocation;
  constructor(properties: Certificate) {
    Object.assign(this, properties);
  }
}

export class CertificateLocation {
  SecretArn!: Value<string>;
  constructor(properties: CertificateLocation) {
    Object.assign(this, properties);
  }
}

export class RecordingConfig {
  Enabled?: Value<boolean>;
  S3Location?: S3Location;
  constructor(properties: RecordingConfig) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Prefix!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroups!: List<Value<string>>;
  Subnets!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface BrowserCustomProperties {
  ExecutionRoleArn?: Value<string>;
  Description?: Value<string>;
  RecordingConfig?: RecordingConfig;
  Certificates?: List<Certificate>;
  EnterprisePolicies?: List<BrowserEnterprisePolicy>;
  NetworkConfiguration: BrowserNetworkConfiguration;
  BrowserSigning?: BrowserSigning;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class BrowserCustom extends ResourceBase<BrowserCustomProperties> {
  static BrowserEnterprisePolicy = BrowserEnterprisePolicy;
  static BrowserNetworkConfiguration = BrowserNetworkConfiguration;
  static BrowserSigning = BrowserSigning;
  static Certificate = Certificate;
  static CertificateLocation = CertificateLocation;
  static RecordingConfig = RecordingConfig;
  static S3Location = S3Location;
  static VpcConfig = VpcConfig;
  constructor(properties: BrowserCustomProperties) {
    super('AWS::BedrockAgentCore::BrowserCustom', properties);
  }
}
