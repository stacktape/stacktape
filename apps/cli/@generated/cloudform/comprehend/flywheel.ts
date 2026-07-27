import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataSecurityConfig {
  VpcConfig?: VpcConfig;
  VolumeKmsKeyId?: Value<string>;
  ModelKmsKeyId?: Value<string>;
  DataLakeKmsKeyId?: Value<string>;
  constructor(properties: DataSecurityConfig) {
    Object.assign(this, properties);
  }
}

export class DocumentClassificationConfig {
  Mode!: Value<string>;
  Labels?: List<Value<string>>;
  constructor(properties: DocumentClassificationConfig) {
    Object.assign(this, properties);
  }
}

export class EntityRecognitionConfig {
  EntityTypes?: List<EntityTypesListItem>;
  constructor(properties: EntityRecognitionConfig) {
    Object.assign(this, properties);
  }
}

export class EntityTypesListItem {
  Type!: Value<string>;
  constructor(properties: EntityTypesListItem) {
    Object.assign(this, properties);
  }
}

export class TaskConfig {
  LanguageCode!: Value<string>;
  DocumentClassificationConfig?: DocumentClassificationConfig;
  EntityRecognitionConfig?: EntityRecognitionConfig;
  constructor(properties: TaskConfig) {
    Object.assign(this, properties);
  }
}

export class VpcConfig {
  Subnets!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: VpcConfig) {
    Object.assign(this, properties);
  }
}
export interface FlywheelProperties {
  DataLakeS3Uri: Value<string>;
  DataAccessRoleArn: Value<string>;
  FlywheelName: Value<string>;
  ModelType?: Value<string>;
  TaskConfig?: TaskConfig;
  ActiveModelArn?: Value<string>;
  DataSecurityConfig?: DataSecurityConfig;
  Tags?: List<ResourceTag>;
}
export default class Flywheel extends ResourceBase<FlywheelProperties> {
  static DataSecurityConfig = DataSecurityConfig;
  static DocumentClassificationConfig = DocumentClassificationConfig;
  static EntityRecognitionConfig = EntityRecognitionConfig;
  static EntityTypesListItem = EntityTypesListItem;
  static TaskConfig = TaskConfig;
  static VpcConfig = VpcConfig;
  constructor(properties: FlywheelProperties) {
    super('AWS::Comprehend::Flywheel', properties);
  }
}
