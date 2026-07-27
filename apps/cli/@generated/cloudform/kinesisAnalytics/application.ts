import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class CSVMappingParameters {
  RecordRowDelimiter!: Value<string>;
  RecordColumnDelimiter!: Value<string>;
  constructor(properties: CSVMappingParameters) {
    Object.assign(this, properties);
  }
}

export class Input {
  NamePrefix!: Value<string>;
  InputSchema!: InputSchema;
  KinesisStreamsInput?: KinesisStreamsInput;
  KinesisFirehoseInput?: KinesisFirehoseInput;
  InputProcessingConfiguration?: InputProcessingConfiguration;
  InputParallelism?: InputParallelism;
  constructor(properties: Input) {
    Object.assign(this, properties);
  }
}

export class InputLambdaProcessor {
  ResourceARN!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: InputLambdaProcessor) {
    Object.assign(this, properties);
  }
}

export class InputParallelism {
  Count?: Value<number>;
  constructor(properties: InputParallelism) {
    Object.assign(this, properties);
  }
}

export class InputProcessingConfiguration {
  InputLambdaProcessor?: InputLambdaProcessor;
  constructor(properties: InputProcessingConfiguration) {
    Object.assign(this, properties);
  }
}

export class InputSchema {
  RecordEncoding?: Value<string>;
  RecordColumns!: List<RecordColumn>;
  RecordFormat!: RecordFormat;
  constructor(properties: InputSchema) {
    Object.assign(this, properties);
  }
}

export class JSONMappingParameters {
  RecordRowPath!: Value<string>;
  constructor(properties: JSONMappingParameters) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseInput {
  ResourceARN!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: KinesisFirehoseInput) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamsInput {
  ResourceARN!: Value<string>;
  RoleARN!: Value<string>;
  constructor(properties: KinesisStreamsInput) {
    Object.assign(this, properties);
  }
}

export class MappingParameters {
  JSONMappingParameters?: JSONMappingParameters;
  CSVMappingParameters?: CSVMappingParameters;
  constructor(properties: MappingParameters) {
    Object.assign(this, properties);
  }
}

export class RecordColumn {
  Mapping?: Value<string>;
  SqlType!: Value<string>;
  Name!: Value<string>;
  constructor(properties: RecordColumn) {
    Object.assign(this, properties);
  }
}

export class RecordFormat {
  MappingParameters?: MappingParameters;
  RecordFormatType!: Value<string>;
  constructor(properties: RecordFormat) {
    Object.assign(this, properties);
  }
}
export interface ApplicationProperties {
  ApplicationName?: Value<string>;
  Inputs: List<Input>;
  ApplicationDescription?: Value<string>;
  ApplicationCode?: Value<string>;
}
export default class Application extends ResourceBase<ApplicationProperties> {
  static CSVMappingParameters = CSVMappingParameters;
  static Input = Input;
  static InputLambdaProcessor = InputLambdaProcessor;
  static InputParallelism = InputParallelism;
  static InputProcessingConfiguration = InputProcessingConfiguration;
  static InputSchema = InputSchema;
  static JSONMappingParameters = JSONMappingParameters;
  static KinesisFirehoseInput = KinesisFirehoseInput;
  static KinesisStreamsInput = KinesisStreamsInput;
  static MappingParameters = MappingParameters;
  static RecordColumn = RecordColumn;
  static RecordFormat = RecordFormat;
  constructor(properties: ApplicationProperties) {
    super('AWS::KinesisAnalytics::Application', properties);
  }
}
