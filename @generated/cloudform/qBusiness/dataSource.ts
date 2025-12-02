import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AudioExtractionConfiguration {
  AudioExtractionStatus!: Value<string>;
  constructor(properties: AudioExtractionConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataSourceVpcConfiguration {
  SubnetIds!: List<Value<string>>;
  SecurityGroupIds!: List<Value<string>>;
  constructor(properties: DataSourceVpcConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeCondition {
  Operator!: Value<string>;
  Value?: DocumentAttributeValue;
  Key!: Value<string>;
  constructor(properties: DocumentAttributeCondition) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeTarget {
  Value?: DocumentAttributeValue;
  AttributeValueOperator?: Value<string>;
  Key!: Value<string>;
  constructor(properties: DocumentAttributeTarget) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeValue {
  DateValue?: Value<string>;
  LongValue?: Value<number>;
  StringValue?: Value<string>;
  StringListValue?: List<Value<string>>;
  constructor(properties: DocumentAttributeValue) {
    Object.assign(this, properties);
  }
}

export class DocumentEnrichmentConfiguration {
  InlineConfigurations?: List<InlineDocumentEnrichmentConfiguration>;
  PreExtractionHookConfiguration?: HookConfiguration;
  PostExtractionHookConfiguration?: HookConfiguration;
  constructor(properties: DocumentEnrichmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class HookConfiguration {
  LambdaArn?: Value<string>;
  InvocationCondition?: DocumentAttributeCondition;
  S3BucketName?: Value<string>;
  RoleArn?: Value<string>;
  constructor(properties: HookConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageExtractionConfiguration {
  ImageExtractionStatus!: Value<string>;
  constructor(properties: ImageExtractionConfiguration) {
    Object.assign(this, properties);
  }
}

export class InlineDocumentEnrichmentConfiguration {
  Condition?: DocumentAttributeCondition;
  Target?: DocumentAttributeTarget;
  DocumentContentOperator?: Value<string>;
  constructor(properties: InlineDocumentEnrichmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class MediaExtractionConfiguration {
  VideoExtractionConfiguration?: VideoExtractionConfiguration;
  AudioExtractionConfiguration?: AudioExtractionConfiguration;
  ImageExtractionConfiguration?: ImageExtractionConfiguration;
  constructor(properties: MediaExtractionConfiguration) {
    Object.assign(this, properties);
  }
}

export class VideoExtractionConfiguration {
  VideoExtractionStatus!: Value<string>;
  constructor(properties: VideoExtractionConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  IndexId: Value<string>;
  Description?: Value<string>;
  Configuration: { [key: string]: any };
  SyncSchedule?: Value<string>;
  DocumentEnrichmentConfiguration?: DocumentEnrichmentConfiguration;
  MediaExtractionConfiguration?: MediaExtractionConfiguration;
  DisplayName: Value<string>;
  VpcConfiguration?: DataSourceVpcConfiguration;
  ApplicationId: Value<string>;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static AudioExtractionConfiguration = AudioExtractionConfiguration;
  static DataSourceVpcConfiguration = DataSourceVpcConfiguration;
  static DocumentAttributeCondition = DocumentAttributeCondition;
  static DocumentAttributeTarget = DocumentAttributeTarget;
  static DocumentAttributeValue = DocumentAttributeValue;
  static DocumentEnrichmentConfiguration = DocumentEnrichmentConfiguration;
  static HookConfiguration = HookConfiguration;
  static ImageExtractionConfiguration = ImageExtractionConfiguration;
  static InlineDocumentEnrichmentConfiguration = InlineDocumentEnrichmentConfiguration;
  static MediaExtractionConfiguration = MediaExtractionConfiguration;
  static VideoExtractionConfiguration = VideoExtractionConfiguration;
  constructor(properties: DataSourceProperties) {
    super('AWS::QBusiness::DataSource', properties);
  }
}
