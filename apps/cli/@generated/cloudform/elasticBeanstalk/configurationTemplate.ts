import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConfigurationOptionSetting {
  ResourceName?: Value<string>;
  Value?: Value<string>;
  Namespace!: Value<string>;
  OptionName!: Value<string>;
  constructor(properties: ConfigurationOptionSetting) {
    Object.assign(this, properties);
  }
}

export class SourceConfiguration {
  ApplicationName!: Value<string>;
  TemplateName!: Value<string>;
  constructor(properties: SourceConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ConfigurationTemplateProperties {
  EnvironmentId?: Value<string>;
  PlatformArn?: Value<string>;
  ApplicationName: Value<string>;
  Description?: Value<string>;
  OptionSettings?: List<ConfigurationOptionSetting>;
  SourceConfiguration?: SourceConfiguration;
  SolutionStackName?: Value<string>;
}
export default class ConfigurationTemplate extends ResourceBase<ConfigurationTemplateProperties> {
  static ConfigurationOptionSetting = ConfigurationOptionSetting;
  static SourceConfiguration = SourceConfiguration;
  constructor(properties: ConfigurationTemplateProperties) {
    super('AWS::ElasticBeanstalk::ConfigurationTemplate', properties);
  }
}
