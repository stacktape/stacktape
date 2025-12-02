import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataProviderDescriptor {
  DataProviderName?: Value<string>;
  DataProviderArn?: Value<string>;
  SecretsManagerSecretId?: Value<string>;
  SecretsManagerAccessRoleArn?: Value<string>;
  DataProviderIdentifier?: Value<string>;
  constructor(properties: DataProviderDescriptor) {
    Object.assign(this, properties);
  }
}

export class SchemaConversionApplicationAttributes {
  S3BucketPath?: Value<string>;
  S3BucketRoleArn?: Value<string>;
  constructor(properties: SchemaConversionApplicationAttributes) {
    Object.assign(this, properties);
  }
}
export interface MigrationProjectProperties {
  TargetDataProviderDescriptors?: List<DataProviderDescriptor>;
  MigrationProjectName?: Value<string>;
  InstanceProfileName?: Value<string>;
  Description?: Value<string>;
  MigrationProjectIdentifier?: Value<string>;
  SourceDataProviderDescriptors?: List<DataProviderDescriptor>;
  TransformationRules?: Value<string>;
  SchemaConversionApplicationAttributes?: SchemaConversionApplicationAttributes;
  InstanceProfileArn?: Value<string>;
  Tags?: List<ResourceTag>;
  InstanceProfileIdentifier?: Value<string>;
}
export default class MigrationProject extends ResourceBase<MigrationProjectProperties> {
  static DataProviderDescriptor = DataProviderDescriptor;
  static SchemaConversionApplicationAttributes = SchemaConversionApplicationAttributes;
  constructor(properties?: MigrationProjectProperties) {
    super('AWS::DMS::MigrationProject', properties || {});
  }
}
