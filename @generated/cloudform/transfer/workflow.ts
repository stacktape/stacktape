import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CopyStepDetails {
  DestinationFileLocation?: S3FileLocation;
  SourceFileLocation?: Value<string>;
  Name?: Value<string>;
  OverwriteExisting?: Value<string>;
  constructor(properties: CopyStepDetails) {
    Object.assign(this, properties);
  }
}

export class CustomStepDetails {
  TimeoutSeconds?: Value<number>;
  Target?: Value<string>;
  SourceFileLocation?: Value<string>;
  Name?: Value<string>;
  constructor(properties: CustomStepDetails) {
    Object.assign(this, properties);
  }
}

export class DecryptStepDetails {
  DestinationFileLocation!: InputFileLocation;
  Type!: Value<string>;
  SourceFileLocation?: Value<string>;
  Name?: Value<string>;
  OverwriteExisting?: Value<string>;
  constructor(properties: DecryptStepDetails) {
    Object.assign(this, properties);
  }
}

export class DeleteStepDetails {
  SourceFileLocation?: Value<string>;
  Name?: Value<string>;
  constructor(properties: DeleteStepDetails) {
    Object.assign(this, properties);
  }
}

export class EfsInputFileLocation {
  Path?: Value<string>;
  FileSystemId?: Value<string>;
  constructor(properties: EfsInputFileLocation) {
    Object.assign(this, properties);
  }
}

export class InputFileLocation {
  EfsFileLocation?: EfsInputFileLocation;
  S3FileLocation?: S3InputFileLocation;
  constructor(properties: InputFileLocation) {
    Object.assign(this, properties);
  }
}

export class S3FileLocation {
  S3FileLocation?: S3InputFileLocation;
  constructor(properties: S3FileLocation) {
    Object.assign(this, properties);
  }
}

export class S3InputFileLocation {
  Bucket?: Value<string>;
  Key?: Value<string>;
  constructor(properties: S3InputFileLocation) {
    Object.assign(this, properties);
  }
}

export class S3Tag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: S3Tag) {
    Object.assign(this, properties);
  }
}

export class TagStepDetails {
  SourceFileLocation?: Value<string>;
  Tags?: List<S3Tag>;
  Name?: Value<string>;
  constructor(properties: TagStepDetails) {
    Object.assign(this, properties);
  }
}

export class WorkflowStep {
  CustomStepDetails?: CustomStepDetails;
  CopyStepDetails?: CopyStepDetails;
  DecryptStepDetails?: DecryptStepDetails;
  Type?: Value<string>;
  TagStepDetails?: TagStepDetails;
  DeleteStepDetails?: DeleteStepDetails;
  constructor(properties: WorkflowStep) {
    Object.assign(this, properties);
  }
}
export interface WorkflowProperties {
  Steps: List<WorkflowStep>;
  Description?: Value<string>;
  OnExceptionSteps?: List<WorkflowStep>;
  Tags?: List<ResourceTag>;
}
export default class Workflow extends ResourceBase<WorkflowProperties> {
  static CopyStepDetails = CopyStepDetails;
  static CustomStepDetails = CustomStepDetails;
  static DecryptStepDetails = DecryptStepDetails;
  static DeleteStepDetails = DeleteStepDetails;
  static EfsInputFileLocation = EfsInputFileLocation;
  static InputFileLocation = InputFileLocation;
  static S3FileLocation = S3FileLocation;
  static S3InputFileLocation = S3InputFileLocation;
  static S3Tag = S3Tag;
  static TagStepDetails = TagStepDetails;
  static WorkflowStep = WorkflowStep;
  constructor(properties: WorkflowProperties) {
    super('AWS::Transfer::Workflow', properties);
  }
}
