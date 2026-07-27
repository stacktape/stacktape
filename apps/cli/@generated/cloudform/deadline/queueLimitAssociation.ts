import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface QueueLimitAssociationProperties {
  LimitId: Value<string>;
  QueueId: Value<string>;
  FarmId: Value<string>;
}
export default class QueueLimitAssociation extends ResourceBase<QueueLimitAssociationProperties> {
  constructor(properties: QueueLimitAssociationProperties) {
    super('AWS::Deadline::QueueLimitAssociation', properties);
  }
}
