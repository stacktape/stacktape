import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AudioExtractionCategory {
  Types?: List<Value<string>>;
  State!: Value<string>;
  TypeConfiguration?: AudioExtractionCategoryTypeConfiguration;
  constructor(properties: AudioExtractionCategory) {
    Object.assign(this, properties);
  }
}

export class AudioExtractionCategoryTypeConfiguration {
  Transcript?: TranscriptConfiguration;
  constructor(properties: AudioExtractionCategoryTypeConfiguration) {
    Object.assign(this, properties);
  }
}

export class AudioOverrideConfiguration {
  ModalityProcessing?: ModalityProcessingConfiguration;
  constructor(properties: AudioOverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class AudioStandardExtraction {
  Category!: AudioExtractionCategory;
  constructor(properties: AudioStandardExtraction) {
    Object.assign(this, properties);
  }
}

export class AudioStandardGenerativeField {
  Types?: List<Value<string>>;
  State!: Value<string>;
  constructor(properties: AudioStandardGenerativeField) {
    Object.assign(this, properties);
  }
}

export class AudioStandardOutputConfiguration {
  GenerativeField?: AudioStandardGenerativeField;
  Extraction?: AudioStandardExtraction;
  constructor(properties: AudioStandardOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class BlueprintItem {
  BlueprintVersion?: Value<string>;
  BlueprintStage?: Value<string>;
  BlueprintArn!: Value<string>;
  constructor(properties: BlueprintItem) {
    Object.assign(this, properties);
  }
}

export class ChannelLabelingConfiguration {
  State!: Value<string>;
  constructor(properties: ChannelLabelingConfiguration) {
    Object.assign(this, properties);
  }
}

export class CustomOutputConfiguration {
  Blueprints?: List<BlueprintItem>;
  constructor(properties: CustomOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentBoundingBox {
  State!: Value<string>;
  constructor(properties: DocumentBoundingBox) {
    Object.assign(this, properties);
  }
}

export class DocumentExtractionGranularity {
  Types?: List<Value<string>>;
  constructor(properties: DocumentExtractionGranularity) {
    Object.assign(this, properties);
  }
}

export class DocumentOutputAdditionalFileFormat {
  State!: Value<string>;
  constructor(properties: DocumentOutputAdditionalFileFormat) {
    Object.assign(this, properties);
  }
}

export class DocumentOutputFormat {
  TextFormat!: DocumentOutputTextFormat;
  AdditionalFileFormat!: DocumentOutputAdditionalFileFormat;
  constructor(properties: DocumentOutputFormat) {
    Object.assign(this, properties);
  }
}

export class DocumentOutputTextFormat {
  Types?: List<Value<string>>;
  constructor(properties: DocumentOutputTextFormat) {
    Object.assign(this, properties);
  }
}

export class DocumentOverrideConfiguration {
  Splitter?: SplitterConfiguration;
  ModalityProcessing?: ModalityProcessingConfiguration;
  constructor(properties: DocumentOverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentStandardExtraction {
  BoundingBox!: DocumentBoundingBox;
  Granularity!: DocumentExtractionGranularity;
  constructor(properties: DocumentStandardExtraction) {
    Object.assign(this, properties);
  }
}

export class DocumentStandardGenerativeField {
  State!: Value<string>;
  constructor(properties: DocumentStandardGenerativeField) {
    Object.assign(this, properties);
  }
}

export class DocumentStandardOutputConfiguration {
  OutputFormat?: DocumentOutputFormat;
  GenerativeField?: DocumentStandardGenerativeField;
  Extraction?: DocumentStandardExtraction;
  constructor(properties: DocumentStandardOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageBoundingBox {
  State!: Value<string>;
  constructor(properties: ImageBoundingBox) {
    Object.assign(this, properties);
  }
}

export class ImageExtractionCategory {
  Types?: List<Value<string>>;
  State!: Value<string>;
  constructor(properties: ImageExtractionCategory) {
    Object.assign(this, properties);
  }
}

export class ImageOverrideConfiguration {
  ModalityProcessing?: ModalityProcessingConfiguration;
  constructor(properties: ImageOverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class ImageStandardExtraction {
  Category!: ImageExtractionCategory;
  BoundingBox!: ImageBoundingBox;
  constructor(properties: ImageStandardExtraction) {
    Object.assign(this, properties);
  }
}

export class ImageStandardGenerativeField {
  Types?: List<Value<string>>;
  State!: Value<string>;
  constructor(properties: ImageStandardGenerativeField) {
    Object.assign(this, properties);
  }
}

export class ImageStandardOutputConfiguration {
  GenerativeField?: ImageStandardGenerativeField;
  Extraction?: ImageStandardExtraction;
  constructor(properties: ImageStandardOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class ModalityProcessingConfiguration {
  State?: Value<string>;
  constructor(properties: ModalityProcessingConfiguration) {
    Object.assign(this, properties);
  }
}

export class ModalityRoutingConfiguration {
  mp4?: Value<string>;
  mov?: Value<string>;
  png?: Value<string>;
  jpeg?: Value<string>;
  constructor(properties: ModalityRoutingConfiguration) {
    Object.assign(this, properties);
  }
}

export class OverrideConfiguration {
  Video?: VideoOverrideConfiguration;
  ModalityRouting?: ModalityRoutingConfiguration;
  Document?: DocumentOverrideConfiguration;
  Audio?: AudioOverrideConfiguration;
  Image?: ImageOverrideConfiguration;
  constructor(properties: OverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class SpeakerLabelingConfiguration {
  State!: Value<string>;
  constructor(properties: SpeakerLabelingConfiguration) {
    Object.assign(this, properties);
  }
}

export class SplitterConfiguration {
  State?: Value<string>;
  constructor(properties: SplitterConfiguration) {
    Object.assign(this, properties);
  }
}

export class StandardOutputConfiguration {
  Video?: VideoStandardOutputConfiguration;
  Document?: DocumentStandardOutputConfiguration;
  Image?: ImageStandardOutputConfiguration;
  Audio?: AudioStandardOutputConfiguration;
  constructor(properties: StandardOutputConfiguration) {
    Object.assign(this, properties);
  }
}

export class TranscriptConfiguration {
  ChannelLabeling?: ChannelLabelingConfiguration;
  SpeakerLabeling?: SpeakerLabelingConfiguration;
  constructor(properties: TranscriptConfiguration) {
    Object.assign(this, properties);
  }
}

export class VideoBoundingBox {
  State!: Value<string>;
  constructor(properties: VideoBoundingBox) {
    Object.assign(this, properties);
  }
}

export class VideoExtractionCategory {
  Types?: List<Value<string>>;
  State!: Value<string>;
  constructor(properties: VideoExtractionCategory) {
    Object.assign(this, properties);
  }
}

export class VideoOverrideConfiguration {
  ModalityProcessing?: ModalityProcessingConfiguration;
  constructor(properties: VideoOverrideConfiguration) {
    Object.assign(this, properties);
  }
}

export class VideoStandardExtraction {
  Category!: VideoExtractionCategory;
  BoundingBox!: VideoBoundingBox;
  constructor(properties: VideoStandardExtraction) {
    Object.assign(this, properties);
  }
}

export class VideoStandardGenerativeField {
  Types?: List<Value<string>>;
  State!: Value<string>;
  constructor(properties: VideoStandardGenerativeField) {
    Object.assign(this, properties);
  }
}

export class VideoStandardOutputConfiguration {
  GenerativeField?: VideoStandardGenerativeField;
  Extraction?: VideoStandardExtraction;
  constructor(properties: VideoStandardOutputConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataAutomationProjectProperties {
  KmsKeyId?: Value<string>;
  ProjectName: Value<string>;
  StandardOutputConfiguration?: StandardOutputConfiguration;
  OverrideConfiguration?: OverrideConfiguration;
  KmsEncryptionContext?: { [key: string]: Value<string> };
  CustomOutputConfiguration?: CustomOutputConfiguration;
  ProjectDescription?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataAutomationProject extends ResourceBase<DataAutomationProjectProperties> {
  static AudioExtractionCategory = AudioExtractionCategory;
  static AudioExtractionCategoryTypeConfiguration = AudioExtractionCategoryTypeConfiguration;
  static AudioOverrideConfiguration = AudioOverrideConfiguration;
  static AudioStandardExtraction = AudioStandardExtraction;
  static AudioStandardGenerativeField = AudioStandardGenerativeField;
  static AudioStandardOutputConfiguration = AudioStandardOutputConfiguration;
  static BlueprintItem = BlueprintItem;
  static ChannelLabelingConfiguration = ChannelLabelingConfiguration;
  static CustomOutputConfiguration = CustomOutputConfiguration;
  static DocumentBoundingBox = DocumentBoundingBox;
  static DocumentExtractionGranularity = DocumentExtractionGranularity;
  static DocumentOutputAdditionalFileFormat = DocumentOutputAdditionalFileFormat;
  static DocumentOutputFormat = DocumentOutputFormat;
  static DocumentOutputTextFormat = DocumentOutputTextFormat;
  static DocumentOverrideConfiguration = DocumentOverrideConfiguration;
  static DocumentStandardExtraction = DocumentStandardExtraction;
  static DocumentStandardGenerativeField = DocumentStandardGenerativeField;
  static DocumentStandardOutputConfiguration = DocumentStandardOutputConfiguration;
  static ImageBoundingBox = ImageBoundingBox;
  static ImageExtractionCategory = ImageExtractionCategory;
  static ImageOverrideConfiguration = ImageOverrideConfiguration;
  static ImageStandardExtraction = ImageStandardExtraction;
  static ImageStandardGenerativeField = ImageStandardGenerativeField;
  static ImageStandardOutputConfiguration = ImageStandardOutputConfiguration;
  static ModalityProcessingConfiguration = ModalityProcessingConfiguration;
  static ModalityRoutingConfiguration = ModalityRoutingConfiguration;
  static OverrideConfiguration = OverrideConfiguration;
  static SpeakerLabelingConfiguration = SpeakerLabelingConfiguration;
  static SplitterConfiguration = SplitterConfiguration;
  static StandardOutputConfiguration = StandardOutputConfiguration;
  static TranscriptConfiguration = TranscriptConfiguration;
  static VideoBoundingBox = VideoBoundingBox;
  static VideoExtractionCategory = VideoExtractionCategory;
  static VideoOverrideConfiguration = VideoOverrideConfiguration;
  static VideoStandardExtraction = VideoStandardExtraction;
  static VideoStandardGenerativeField = VideoStandardGenerativeField;
  static VideoStandardOutputConfiguration = VideoStandardOutputConfiguration;
  constructor(properties: DataAutomationProjectProperties) {
    super('AWS::Bedrock::DataAutomationProject', properties);
  }
}
