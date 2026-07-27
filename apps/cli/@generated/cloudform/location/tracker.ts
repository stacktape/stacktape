import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface TrackerProperties {
  TrackerName: Value<string>;
  Description?: Value<string>;
  EventBridgeEnabled?: Value<boolean>;
  KmsKeyId?: Value<string>;
  KmsKeyEnableGeospatialQueries?: Value<boolean>;
  PositionFiltering?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Tracker extends ResourceBase<TrackerProperties> {
  constructor(properties: TrackerProperties) {
    super('AWS::Location::Tracker', properties);
  }
}
