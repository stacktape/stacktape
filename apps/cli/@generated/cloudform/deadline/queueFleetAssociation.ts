import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface QueueFleetAssociationProperties {
  FleetId: Value<string>;
  QueueId: Value<string>;
  FarmId: Value<string>;
}
export default class QueueFleetAssociation extends ResourceBase<QueueFleetAssociationProperties> {
  constructor(properties: QueueFleetAssociationProperties) {
    super('AWS::Deadline::QueueFleetAssociation', properties);
  }
}
