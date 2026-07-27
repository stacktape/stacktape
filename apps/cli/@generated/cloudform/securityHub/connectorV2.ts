import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class JiraCloudProviderConfiguration {
  ProjectKey!: Value<string>;
  constructor(properties: JiraCloudProviderConfiguration) {
    Object.assign(this, properties);
  }
}

export class Provider {
  ServiceNow?: ServiceNowProviderConfiguration;
  JiraCloud?: JiraCloudProviderConfiguration;
  constructor(properties: Provider) {
    Object.assign(this, properties);
  }
}

export class ServiceNowProviderConfiguration {
  InstanceName!: Value<string>;
  SecretArn!: Value<string>;
  constructor(properties: ServiceNowProviderConfiguration) {
    Object.assign(this, properties);
  }
}
export interface ConnectorV2Properties {
  Description?: Value<string>;
  KmsKeyArn?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
  Provider: Provider;
}
export default class ConnectorV2 extends ResourceBase<ConnectorV2Properties> {
  static JiraCloudProviderConfiguration = JiraCloudProviderConfiguration;
  static Provider = Provider;
  static ServiceNowProviderConfiguration = ServiceNowProviderConfiguration;
  constructor(properties: ConnectorV2Properties) {
    super('AWS::SecurityHub::ConnectorV2', properties);
  }
}
