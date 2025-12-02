import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface ReportDefinitionProperties {
  Compression: Value<string>;
  RefreshClosedReports: Value<boolean>;
  ReportVersioning: Value<string>;
  S3Prefix: Value<string>;
  AdditionalSchemaElements?: List<Value<string>>;
  AdditionalArtifacts?: List<Value<string>>;
  ReportName: Value<string>;
  Format: Value<string>;
  S3Bucket: Value<string>;
  S3Region: Value<string>;
  TimeUnit: Value<string>;
  BillingViewArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class ReportDefinition extends ResourceBase<ReportDefinitionProperties> {
  constructor(properties: ReportDefinitionProperties) {
    super('AWS::CUR::ReportDefinition', properties);
  }
}
