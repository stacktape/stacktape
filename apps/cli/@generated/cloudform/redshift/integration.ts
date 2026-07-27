import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface IntegrationProperties {
  IntegrationName?: Value<string>;
  KMSKeyId?: Value<string>;
  SourceArn: Value<string>;
  TargetArn: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  Tags?: List<ResourceTag>;
}
export default class Integration extends ResourceBase<IntegrationProperties> {
  constructor(properties: IntegrationProperties) {
    super('AWS::Redshift::Integration', properties);
  }
}
