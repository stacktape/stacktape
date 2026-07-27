import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ReportExportConfig {
  S3Destination?: S3ReportExportConfig;
  ExportConfigType!: Value<string>;
  constructor(properties: ReportExportConfig) {
    Object.assign(this, properties);
  }
}

export class S3ReportExportConfig {
  Path?: Value<string>;
  Bucket!: Value<string>;
  Packaging?: Value<string>;
  EncryptionKey?: Value<string>;
  BucketOwner?: Value<string>;
  EncryptionDisabled?: Value<boolean>;
  constructor(properties: S3ReportExportConfig) {
    Object.assign(this, properties);
  }
}
export interface ReportGroupProperties {
  Type: Value<string>;
  ExportConfig: ReportExportConfig;
  DeleteReports?: Value<boolean>;
  Tags?: List<ResourceTag>;
  Name?: Value<string>;
}
export default class ReportGroup extends ResourceBase<ReportGroupProperties> {
  static ReportExportConfig = ReportExportConfig;
  static S3ReportExportConfig = S3ReportExportConfig;
  constructor(properties: ReportGroupProperties) {
    super('AWS::CodeBuild::ReportGroup', properties);
  }
}
