import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class IntegrationConfig {
  ContinuousSync?: Value<boolean>;
  RefreshInterval?: Value<string>;
  SourceProperties?: { [key: string]: Value<string> };
  constructor(properties: IntegrationConfig) {
    Object.assign(this, properties);
  }
}
export interface IntegrationProperties {
  DataFilter?: Value<string>;
  IntegrationName: Value<string>;
  Description?: Value<string>;
  SourceArn: Value<string>;
  IntegrationConfig?: IntegrationConfig;
  KmsKeyId?: Value<string>;
  TargetArn: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  Tags?: List<ResourceTag>;
}
export default class Integration extends ResourceBase<IntegrationProperties> {
  static IntegrationConfig = IntegrationConfig;
  constructor(properties: IntegrationProperties) {
    super('AWS::Glue::Integration', properties);
  }
}
