import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
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

export class CodeInterpreterNetworkConfiguration {
  VpcConfig?: VpcConfig;
  NetworkMode!: Value<string>;
  constructor(properties: CodeInterpreterNetworkConfiguration) {
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
export interface CodeInterpreterCustomProperties {
  ExecutionRoleArn?: Value<string>;
  Description?: Value<string>;
  Certificates?: List<Certificate>;
  NetworkConfiguration: CodeInterpreterNetworkConfiguration;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class CodeInterpreterCustom extends ResourceBase<CodeInterpreterCustomProperties> {
  static Certificate = Certificate;
  static CertificateLocation = CertificateLocation;
  static CodeInterpreterNetworkConfiguration = CodeInterpreterNetworkConfiguration;
  static VpcConfig = VpcConfig;
  constructor(properties: CodeInterpreterCustomProperties) {
    super('AWS::BedrockAgentCore::CodeInterpreterCustom', properties);
  }
}
