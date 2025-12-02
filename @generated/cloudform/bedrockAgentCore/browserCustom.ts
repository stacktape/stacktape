import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class BrowserNetworkConfiguration {
  VpcConfig?: VpcConfig;
  NetworkMode!: Value<string>;
  constructor(properties: BrowserNetworkConfiguration) {
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
  NetworkConfiguration: BrowserNetworkConfiguration;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class BrowserCustom extends ResourceBase<BrowserCustomProperties> {
  static BrowserNetworkConfiguration = BrowserNetworkConfiguration;
  static RecordingConfig = RecordingConfig;
  static S3Location = S3Location;
  static VpcConfig = VpcConfig;
  constructor(properties: BrowserCustomProperties) {
    super('AWS::BedrockAgentCore::BrowserCustom', properties);
  }
}
