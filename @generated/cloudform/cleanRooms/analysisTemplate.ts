import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AnalysisParameter {
  DefaultValue?: Value<string>;
  Type!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AnalysisParameter) {
    Object.assign(this, properties);
  }
}

export class AnalysisSchema {
  ReferencedTables!: List<Value<string>>;
  constructor(properties: AnalysisSchema) {
    Object.assign(this, properties);
  }
}

export class AnalysisSource {
  Artifacts?: AnalysisTemplateArtifacts;
  Text?: Value<string>;
  constructor(properties: AnalysisSource) {
    Object.assign(this, properties);
  }
}

export class AnalysisSourceMetadata {
  Artifacts!: AnalysisTemplateArtifactMetadata;
  constructor(properties: AnalysisSourceMetadata) {
    Object.assign(this, properties);
  }
}

export class AnalysisTemplateArtifact {
  Location!: S3Location;
  constructor(properties: AnalysisTemplateArtifact) {
    Object.assign(this, properties);
  }
}

export class AnalysisTemplateArtifactMetadata {
  EntryPointHash!: Hash;
  AdditionalArtifactHashes?: List<Hash>;
  constructor(properties: AnalysisTemplateArtifactMetadata) {
    Object.assign(this, properties);
  }
}

export class AnalysisTemplateArtifacts {
  AdditionalArtifacts?: List<AnalysisTemplateArtifact>;
  EntryPoint!: AnalysisTemplateArtifact;
  RoleArn!: Value<string>;
  constructor(properties: AnalysisTemplateArtifacts) {
    Object.assign(this, properties);
  }
}

export class ErrorMessageConfiguration {
  Type!: Value<string>;
  constructor(properties: ErrorMessageConfiguration) {
    Object.assign(this, properties);
  }
}

export class Hash {
  Sha256?: Value<string>;
  constructor(properties: Hash) {
    Object.assign(this, properties);
  }
}

export class S3Location {
  Bucket!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Location) {
    Object.assign(this, properties);
  }
}
export interface AnalysisTemplateProperties {
  MembershipIdentifier: Value<string>;
  Description?: Value<string>;
  Format: Value<string>;
  SourceMetadata?: AnalysisSourceMetadata;
  ErrorMessageConfiguration?: ErrorMessageConfiguration;
  AnalysisParameters?: List<AnalysisParameter>;
  Schema?: AnalysisSchema;
  Source: AnalysisSource;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class AnalysisTemplate extends ResourceBase<AnalysisTemplateProperties> {
  static AnalysisParameter = AnalysisParameter;
  static AnalysisSchema = AnalysisSchema;
  static AnalysisSource = AnalysisSource;
  static AnalysisSourceMetadata = AnalysisSourceMetadata;
  static AnalysisTemplateArtifact = AnalysisTemplateArtifact;
  static AnalysisTemplateArtifactMetadata = AnalysisTemplateArtifactMetadata;
  static AnalysisTemplateArtifacts = AnalysisTemplateArtifacts;
  static ErrorMessageConfiguration = ErrorMessageConfiguration;
  static Hash = Hash;
  static S3Location = S3Location;
  constructor(properties: AnalysisTemplateProperties) {
    super('AWS::CleanRooms::AnalysisTemplate', properties);
  }
}
