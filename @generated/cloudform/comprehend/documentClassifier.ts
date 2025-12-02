import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AugmentedManifestsListItem {
  S3Uri!: Value<string>;
  AttributeNames!: List<Value<string>>;
  Split?: Value<string>;
  constructor(properties: AugmentedManifestsListItem) {
    Object.assign(this, properties);
  }
}

export class DocumentClassifierDocuments {
  S3Uri!: Value<string>;
  TestS3Uri?: Value<string>;
  constructor(properties: DocumentClassifierDocuments) {
    Object.assign(this, properties);
  }
}

export class DocumentClassifierInputDataConfig {
  DocumentReaderConfig?: DocumentReaderConfig;
  S3Uri?: Value<string>;
  Documents?: DocumentClassifierDocuments;
  DataFormat?: Value<string>;
  DocumentType?: Value<string>;
  AugmentedManifests?: List<AugmentedManifestsListItem>;
  LabelDelimiter?: Value<string>;
  TestS3Uri?: Value<string>;
  constructor(properties: DocumentClassifierInputDataConfig) {
    Object.assign(this, properties);
  }
}

export class DocumentClassifierOutputDataConfig {
  KmsKeyId?: Value<string>;
  S3Uri?: Value<string>;
  constructor(properties: DocumentClassifierOutputDataConfig) {
    Object.assign(this, properties);
  }
}

export class DocumentReaderConfig {
  FeatureTypes?: List<Value<string>>;
  DocumentReadMode?: Value<string>;
  DocumentReadAction!: Value<string>;
  constructor(properties: DocumentReaderConfig) {
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
export interface DocumentClassifierProperties {
  LanguageCode: Value<string>;
  DataAccessRoleArn: Value<string>;
  OutputDataConfig?: DocumentClassifierOutputDataConfig;
  VpcConfig?: VpcConfig;
  DocumentClassifierName: Value<string>;
  Mode?: Value<string>;
  VolumeKmsKeyId?: Value<string>;
  ModelKmsKeyId?: Value<string>;
  VersionName?: Value<string>;
  ModelPolicy?: Value<string>;
  InputDataConfig: DocumentClassifierInputDataConfig;
  Tags?: List<ResourceTag>;
}
export default class DocumentClassifier extends ResourceBase<DocumentClassifierProperties> {
  static AugmentedManifestsListItem = AugmentedManifestsListItem;
  static DocumentClassifierDocuments = DocumentClassifierDocuments;
  static DocumentClassifierInputDataConfig = DocumentClassifierInputDataConfig;
  static DocumentClassifierOutputDataConfig = DocumentClassifierOutputDataConfig;
  static DocumentReaderConfig = DocumentReaderConfig;
  static VpcConfig = VpcConfig;
  constructor(properties: DocumentClassifierProperties) {
    super('AWS::Comprehend::DocumentClassifier', properties);
  }
}
