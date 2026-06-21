import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AWSConfiguration {
  AssumableRoleArn!: Value<string>;
  AccountId!: Value<string>;
  Resources?: List<AWSResource>;
  AccountType!: Value<string>;
  Tags?: List<KeyValuePair>;
  constructor(properties: AWSConfiguration) {
    Object.assign(this, properties);
  }
}

export class AWSResource {
  ResourceMetadata?: { [key: string]: any };
  ResourceArn!: Value<string>;
  ResourceType?: Value<string>;
  constructor(properties: AWSResource) {
    Object.assign(this, properties);
  }
}

export class AzureConfiguration {
  SubscriptionId!: Value<string>;
  constructor(properties: AzureConfiguration) {
    Object.assign(this, properties);
  }
}

export class DynatraceConfiguration {
  EnvId!: Value<string>;
  Resources?: List<Value<string>>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: DynatraceConfiguration) {
    Object.assign(this, properties);
  }
}

export class EventChannelConfiguration {
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: EventChannelConfiguration) {
    Object.assign(this, properties);
  }
}

export class GitHubConfiguration {
  Owner!: Value<string>;
  OwnerType!: Value<string>;
  RepoName!: Value<string>;
  RepoId!: Value<string>;
  constructor(properties: GitHubConfiguration) {
    Object.assign(this, properties);
  }
}

export class GitLabConfiguration {
  ProjectId!: Value<string>;
  InstanceIdentifier?: Value<string>;
  ProjectPath!: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: GitLabConfiguration) {
    Object.assign(this, properties);
  }
}

export class KeyValuePair {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: KeyValuePair) {
    Object.assign(this, properties);
  }
}

export class MCPServerConfiguration {
  Description?: Value<string>;
  Endpoint?: Value<string>;
  Tools!: List<Value<string>>;
  Name?: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: MCPServerConfiguration) {
    Object.assign(this, properties);
  }
}

export class MCPServerDatadogConfiguration {
  Description?: Value<string>;
  Endpoint?: Value<string>;
  Name?: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: MCPServerDatadogConfiguration) {
    Object.assign(this, properties);
  }
}

export class MCPServerGrafanaConfiguration {
  Endpoint!: Value<string>;
  Tools?: List<Value<string>>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: MCPServerGrafanaConfiguration) {
    Object.assign(this, properties);
  }
}

export class MCPServerNewRelicConfiguration {
  AccountId!: Value<string>;
  Endpoint!: Value<string>;
  constructor(properties: MCPServerNewRelicConfiguration) {
    Object.assign(this, properties);
  }
}

export class MCPServerSigV4Configuration {
  Tools!: List<Value<string>>;
  constructor(properties: MCPServerSigV4Configuration) {
    Object.assign(this, properties);
  }
}

export class MCPServerSplunkConfiguration {
  Description?: Value<string>;
  Endpoint?: Value<string>;
  Name?: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: MCPServerSplunkConfiguration) {
    Object.assign(this, properties);
  }
}

export class PagerDutyConfiguration {
  Services!: List<Value<string>>;
  CustomerEmail!: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: PagerDutyConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceConfiguration {
  MCPServer?: MCPServerConfiguration;
  ServiceNow?: ServiceNowConfiguration;
  Azure?: AzureConfiguration;
  GitHub?: GitHubConfiguration;
  MCPServerGrafana?: MCPServerGrafanaConfiguration;
  MCPServerSplunk?: MCPServerSplunkConfiguration;
  MCPServerNewRelic?: MCPServerNewRelicConfiguration;
  PagerDuty?: PagerDutyConfiguration;
  EventChannel?: EventChannelConfiguration;
  SourceAws?: SourceAwsConfiguration;
  Slack?: SlackConfiguration;
  MCPServerDatadog?: MCPServerDatadogConfiguration;
  Dynatrace?: DynatraceConfiguration;
  MCPServerSigV4?: MCPServerSigV4Configuration;
  Aws?: AWSConfiguration;
  GitLab?: GitLabConfiguration;
  constructor(properties: ServiceConfiguration) {
    Object.assign(this, properties);
  }
}

export class ServiceNowConfiguration {
  InstanceId?: Value<string>;
  EnableWebhookUpdates?: Value<boolean>;
  constructor(properties: ServiceNowConfiguration) {
    Object.assign(this, properties);
  }
}

export class SlackChannel {
  ChannelName?: Value<string>;
  ChannelId!: Value<string>;
  constructor(properties: SlackChannel) {
    Object.assign(this, properties);
  }
}

export class SlackConfiguration {
  TransmissionTarget!: SlackTransmissionTarget;
  WorkspaceId!: Value<string>;
  WorkspaceName!: Value<string>;
  constructor(properties: SlackConfiguration) {
    Object.assign(this, properties);
  }
}

export class SlackTransmissionTarget {
  IncidentResponseTarget!: SlackChannel;
  constructor(properties: SlackTransmissionTarget) {
    Object.assign(this, properties);
  }
}

export class SourceAwsConfiguration {
  AssumableRoleArn!: Value<string>;
  AccountId!: Value<string>;
  Resources?: List<AWSResource>;
  AccountType!: Value<string>;
  Tags?: List<KeyValuePair>;
  constructor(properties: SourceAwsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface AssociationProperties {
  Configuration: ServiceConfiguration;
  LinkedAssociationIds?: List<Value<string>>;
  AgentSpaceId: Value<string>;
  ServiceId: Value<string>;
}
export default class Association extends ResourceBase<AssociationProperties> {
  static AWSConfiguration = AWSConfiguration;
  static AWSResource = AWSResource;
  static AzureConfiguration = AzureConfiguration;
  static DynatraceConfiguration = DynatraceConfiguration;
  static EventChannelConfiguration = EventChannelConfiguration;
  static GitHubConfiguration = GitHubConfiguration;
  static GitLabConfiguration = GitLabConfiguration;
  static KeyValuePair = KeyValuePair;
  static MCPServerConfiguration = MCPServerConfiguration;
  static MCPServerDatadogConfiguration = MCPServerDatadogConfiguration;
  static MCPServerGrafanaConfiguration = MCPServerGrafanaConfiguration;
  static MCPServerNewRelicConfiguration = MCPServerNewRelicConfiguration;
  static MCPServerSigV4Configuration = MCPServerSigV4Configuration;
  static MCPServerSplunkConfiguration = MCPServerSplunkConfiguration;
  static PagerDutyConfiguration = PagerDutyConfiguration;
  static ServiceConfiguration = ServiceConfiguration;
  static ServiceNowConfiguration = ServiceNowConfiguration;
  static SlackChannel = SlackChannel;
  static SlackConfiguration = SlackConfiguration;
  static SlackTransmissionTarget = SlackTransmissionTarget;
  static SourceAwsConfiguration = SourceAwsConfiguration;
  constructor(properties: AssociationProperties) {
    super('AWS::DevOpsAgent::Association', properties);
  }
}
