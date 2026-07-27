import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SyncConfigurationProperties {
  ConfigFile: Value<string>;
  ResourceName: Value<string>;
  Branch: Value<string>;
  SyncType: Value<string>;
  TriggerResourceUpdateOn?: Value<string>;
  RepositoryLinkId: Value<string>;
  RoleArn: Value<string>;
  PublishDeploymentStatus?: Value<string>;
}
export default class SyncConfiguration extends ResourceBase<SyncConfigurationProperties> {
  constructor(properties: SyncConfigurationProperties) {
    super('AWS::CodeStarConnections::SyncConfiguration', properties);
  }
}
