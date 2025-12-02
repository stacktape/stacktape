import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Batch {
  BatchJobName!: Value<string>;
  ExportDataSetNames?: List<Value<string>>;
  BatchJobParameters?: { [key: string]: Value<string> };
  constructor(properties: Batch) {
    Object.assign(this, properties);
  }
}

export class CloudFormationAction {
  ActionType?: Value<string>;
  Resource!: Value<string>;
  constructor(properties: CloudFormationAction) {
    Object.assign(this, properties);
  }
}

export class CompareAction {
  Input!: Input;
  Output?: Output;
  constructor(properties: CompareAction) {
    Object.assign(this, properties);
  }
}

export class DataSet {
  Ccsid!: Value<string>;
  Type!: Value<string>;
  Format!: Value<string>;
  Length!: Value<number>;
  Name!: Value<string>;
  constructor(properties: DataSet) {
    Object.assign(this, properties);
  }
}

export class DatabaseCDC {
  SourceMetadata!: SourceDatabaseMetadata;
  TargetMetadata!: TargetDatabaseMetadata;
  constructor(properties: DatabaseCDC) {
    Object.assign(this, properties);
  }
}

export class FileMetadata {
  DatabaseCDC?: DatabaseCDC;
  DataSets?: List<DataSet>;
  constructor(properties: FileMetadata) {
    Object.assign(this, properties);
  }
}

export class Input {
  File!: InputFile;
  constructor(properties: Input) {
    Object.assign(this, properties);
  }
}

export class InputFile {
  SourceLocation!: Value<string>;
  TargetLocation!: Value<string>;
  FileMetadata!: FileMetadata;
  constructor(properties: InputFile) {
    Object.assign(this, properties);
  }
}

export class M2ManagedActionProperties {
  ImportDataSetLocation?: Value<string>;
  ForceStop?: Value<boolean>;
  constructor(properties: M2ManagedActionProperties) {
    Object.assign(this, properties);
  }
}

export class M2ManagedApplicationAction {
  ActionType!: Value<string>;
  Resource!: Value<string>;
  Properties?: M2ManagedActionProperties;
  constructor(properties: M2ManagedApplicationAction) {
    Object.assign(this, properties);
  }
}

export class M2NonManagedApplicationAction {
  ActionType!: Value<string>;
  Resource!: Value<string>;
  constructor(properties: M2NonManagedApplicationAction) {
    Object.assign(this, properties);
  }
}

export class MainframeAction {
  ActionType!: MainframeActionType;
  Resource!: Value<string>;
  Properties?: MainframeActionProperties;
  constructor(properties: MainframeAction) {
    Object.assign(this, properties);
  }
}

export class MainframeActionProperties {
  DmsTaskArn?: Value<string>;
  constructor(properties: MainframeActionProperties) {
    Object.assign(this, properties);
  }
}

export class MainframeActionType {
  Batch?: Batch;
  Tn3270?: TN3270;
  constructor(properties: MainframeActionType) {
    Object.assign(this, properties);
  }
}

export class Output {
  File!: OutputFile;
  constructor(properties: Output) {
    Object.assign(this, properties);
  }
}

export class OutputFile {
  FileLocation?: Value<string>;
  constructor(properties: OutputFile) {
    Object.assign(this, properties);
  }
}

export class ResourceAction {
  CloudFormationAction?: CloudFormationAction;
  M2ManagedApplicationAction?: M2ManagedApplicationAction;
  M2NonManagedApplicationAction?: M2NonManagedApplicationAction;
  constructor(properties: ResourceAction) {
    Object.assign(this, properties);
  }
}

export class Script {
  Type!: Value<string>;
  ScriptLocation!: Value<string>;
  constructor(properties: Script) {
    Object.assign(this, properties);
  }
}

export class SourceDatabaseMetadata {
  Type!: Value<string>;
  CaptureTool!: Value<string>;
  constructor(properties: SourceDatabaseMetadata) {
    Object.assign(this, properties);
  }
}

export class Step {
  Action!: StepAction;
  Description?: Value<string>;
  Name!: Value<string>;
  constructor(properties: Step) {
    Object.assign(this, properties);
  }
}

export class StepAction {
  CompareAction?: CompareAction;
  MainframeAction?: MainframeAction;
  ResourceAction?: ResourceAction;
  constructor(properties: StepAction) {
    Object.assign(this, properties);
  }
}

export class TN3270 {
  Script!: Script;
  ExportDataSetNames?: List<Value<string>>;
  constructor(properties: TN3270) {
    Object.assign(this, properties);
  }
}

export class TargetDatabaseMetadata {
  Type!: Value<string>;
  CaptureTool!: Value<string>;
  constructor(properties: TargetDatabaseMetadata) {
    Object.assign(this, properties);
  }
}

export class TestCaseLatestVersion {
  Status!: Value<string>;
  Version!: Value<number>;
  constructor(properties: TestCaseLatestVersion) {
    Object.assign(this, properties);
  }
}
export interface TestCaseProperties {
  Steps: List<Step>;
  Description?: Value<string>;
  Tags?: { [key: string]: Value<string> };
  Name: Value<string>;
}
export default class TestCase extends ResourceBase<TestCaseProperties> {
  static Batch = Batch;
  static CloudFormationAction = CloudFormationAction;
  static CompareAction = CompareAction;
  static DataSet = DataSet;
  static DatabaseCDC = DatabaseCDC;
  static FileMetadata = FileMetadata;
  static Input = Input;
  static InputFile = InputFile;
  static M2ManagedActionProperties = M2ManagedActionProperties;
  static M2ManagedApplicationAction = M2ManagedApplicationAction;
  static M2NonManagedApplicationAction = M2NonManagedApplicationAction;
  static MainframeAction = MainframeAction;
  static MainframeActionProperties = MainframeActionProperties;
  static MainframeActionType = MainframeActionType;
  static Output = Output;
  static OutputFile = OutputFile;
  static ResourceAction = ResourceAction;
  static Script = Script;
  static SourceDatabaseMetadata = SourceDatabaseMetadata;
  static Step = Step;
  static StepAction = StepAction;
  static TN3270 = TN3270;
  static TargetDatabaseMetadata = TargetDatabaseMetadata;
  static TestCaseLatestVersion = TestCaseLatestVersion;
  constructor(properties: TestCaseProperties) {
    super('AWS::AppTest::TestCase', properties);
  }
}
