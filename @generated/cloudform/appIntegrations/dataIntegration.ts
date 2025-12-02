import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FileConfiguration {
  Filters?: { [key: string]: any };
  Folders!: List<Value<string>>;
  constructor(properties: FileConfiguration) {
    Object.assign(this, properties);
  }
}

export class ScheduleConfig {
  FirstExecutionFrom?: Value<string>;
  ScheduleExpression!: Value<string>;
  Object?: Value<string>;
  constructor(properties: ScheduleConfig) {
    Object.assign(this, properties);
  }
}
export interface DataIntegrationProperties {
  ScheduleConfig?: ScheduleConfig;
  FileConfiguration?: FileConfiguration;
  Description?: Value<string>;
  SourceURI: Value<string>;
  ObjectConfiguration?: { [key: string]: any };
  KmsKey: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DataIntegration extends ResourceBase<DataIntegrationProperties> {
  static FileConfiguration = FileConfiguration;
  static ScheduleConfig = ScheduleConfig;
  constructor(properties: DataIntegrationProperties) {
    super('AWS::AppIntegrations::DataIntegration', properties);
  }
}
