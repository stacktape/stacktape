import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface QueueEnvironmentProperties {
  Priority: Value<number>;
  QueueId: Value<string>;
  TemplateType: Value<string>;
  FarmId: Value<string>;
  Template: Value<string>;
}
export default class QueueEnvironment extends ResourceBase<QueueEnvironmentProperties> {
  constructor(properties: QueueEnvironmentProperties) {
    super('AWS::Deadline::QueueEnvironment', properties);
  }
}
