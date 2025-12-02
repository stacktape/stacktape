import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface AutoshiftObserverNotificationStatusProperties {
  Status: Value<string>;
}
export default class AutoshiftObserverNotificationStatus extends ResourceBase<AutoshiftObserverNotificationStatusProperties> {
  constructor(properties: AutoshiftObserverNotificationStatusProperties) {
    super('AWS::ARCZonalShift::AutoshiftObserverNotificationStatus', properties);
  }
}
