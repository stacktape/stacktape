import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface MlflowTrackingServerProperties {
  TrackingServerName: Value<string>;
  MlflowVersion?: Value<string>;
  WeeklyMaintenanceWindowStart?: Value<string>;
  TrackingServerSize?: Value<string>;
  ArtifactStoreUri: Value<string>;
  AutomaticModelRegistration?: Value<boolean>;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class MlflowTrackingServer extends ResourceBase<MlflowTrackingServerProperties> {
  constructor(properties: MlflowTrackingServerProperties) {
    super('AWS::SageMaker::MlflowTrackingServer', properties);
  }
}
