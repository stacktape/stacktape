import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface IngestConfigurationProperties {
  UserId?: Value<string>;
  IngestProtocol?: Value<string>;
  StageArn?: Value<string>;
  InsecureIngest?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class IngestConfiguration extends ResourceBase<IngestConfigurationProperties> {
  constructor(properties?: IngestConfigurationProperties) {
    super('AWS::IVS::IngestConfiguration', properties || {});
  }
}
