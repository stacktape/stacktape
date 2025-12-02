import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CapacityManagerDataExportProperties {
  S3BucketPrefix?: Value<string>;
  Schedule: Value<string>;
  OutputFormat: Value<string>;
  S3BucketName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class CapacityManagerDataExport extends ResourceBase<CapacityManagerDataExportProperties> {
  constructor(properties: CapacityManagerDataExportProperties) {
    super('AWS::EC2::CapacityManagerDataExport', properties);
  }
}
