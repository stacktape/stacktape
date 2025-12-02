import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';

export interface SlackWorkspaceConfigurationProperties {
  VersionId?: Value<string>;
  TeamId: Value<string>;
}
export default class SlackWorkspaceConfiguration extends ResourceBase<SlackWorkspaceConfigurationProperties> {
  constructor(properties: SlackWorkspaceConfigurationProperties) {
    super('AWS::SupportApp::SlackWorkspaceConfiguration', properties);
  }
}
