import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface WorkerConfigurationProperties {
  PropertiesFileContent: Value<string>;
  Description?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class WorkerConfiguration extends ResourceBase<WorkerConfigurationProperties> {
  constructor(properties: WorkerConfigurationProperties) {
    super('AWS::KafkaConnect::WorkerConfiguration', properties);
  }
}
