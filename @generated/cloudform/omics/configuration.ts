import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class RunConfigurations {
  VpcConfig?: VpcConfig;
  constructor(properties: RunConfigurations) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  SecurityGroupIds?: List<Value<string>>;
  SubnetIds?: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationProperties {
  Description?: Value<string>;
  RunConfigurations: RunConfigurations;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class Configuration extends ResourceBase<ConfigurationProperties> {
  static RunConfigurations = RunConfigurations;
  static VpcConfig = VpcConfig;
  constructor(properties: ConfigurationProperties) {
    super('AWS::Omics::Configuration', properties);
  }
}
