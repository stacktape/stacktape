import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class DestinationSchema {
  RecordFormatType?: Value<string>;
  constructor(properties: DestinationSchema) {
    Object.assign(this, properties);
  }
}

export class KinesisFirehoseOutput {
  ResourceARN!: Value<string>;
  constructor(properties: KinesisFirehoseOutput) {
    Object.assign(this, properties);
  }
}

export class KinesisStreamsOutput {
  ResourceARN!: Value<string>;
  constructor(properties: KinesisStreamsOutput) {
    Object.assign(this, properties);
  }
}

export class LambdaOutput {
  ResourceARN!: Value<string>;
  constructor(properties: LambdaOutput) {
    Object.assign(this, properties);
  }
}

export class Output {
  DestinationSchema!: DestinationSchema;
  LambdaOutput?: LambdaOutput;
  KinesisFirehoseOutput?: KinesisFirehoseOutput;
  KinesisStreamsOutput?: KinesisStreamsOutput;
  Name?: Value<string>;
  constructor(properties: Output) {
    Object.assign(this, properties);
  }
}
export interface ApplicationOutputProperties {
  ApplicationName: Value<string>;
  Output: Output;
}
export default class ApplicationOutput extends ResourceBase<ApplicationOutputProperties> {
  static DestinationSchema = DestinationSchema;
  static KinesisFirehoseOutput = KinesisFirehoseOutput;
  static KinesisStreamsOutput = KinesisStreamsOutput;
  static LambdaOutput = LambdaOutput;
  static Output = Output;
  constructor(properties: ApplicationOutputProperties) {
    super('AWS::KinesisAnalyticsV2::ApplicationOutput', properties);
  }
}
