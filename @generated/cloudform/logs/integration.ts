import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class OpenSearchResourceConfig {
  DashboardViewerPrincipals!: List<Value<string>>;
  ApplicationARN?: Value<string>;
  KmsKeyArn?: Value<string>;
  RetentionDays?: Value<number>;
  DataSourceRoleArn!: Value<string>;
  constructor(properties: OpenSearchResourceConfig) {
    Object.assign(this, properties);
  }
}

export class ResourceConfig {
  OpenSearchResourceConfig?: OpenSearchResourceConfig;
  constructor(properties: ResourceConfig) {
    Object.assign(this, properties);
  }
}
export interface IntegrationProperties {
  IntegrationName: Value<string>;
  ResourceConfig: ResourceConfig;
  IntegrationType: Value<string>;
}
export default class Integration extends ResourceBase<IntegrationProperties> {
  static OpenSearchResourceConfig = OpenSearchResourceConfig;
  static ResourceConfig = ResourceConfig;
  constructor(properties: IntegrationProperties) {
    super('AWS::Logs::Integration', properties);
  }
}
