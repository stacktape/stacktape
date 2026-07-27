import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Field {
  RefValue?: Value<string>;
  StringValue?: Value<string>;
  Key!: Value<string>;
  constructor(properties: Field) {
    Object.assign(this, properties);
  }
}

export class ParameterAttribute {
  StringValue!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ParameterAttribute) {
    Object.assign(this, properties);
  }
}

export class ParameterObject {
  Attributes!: List<ParameterAttribute>;
  Id!: Value<string>;
  constructor(properties: ParameterObject) {
    Object.assign(this, properties);
  }
}

export class ParameterValue {
  Id!: Value<string>;
  StringValue!: Value<string>;
  constructor(properties: ParameterValue) {
    Object.assign(this, properties);
  }
}

export class PipelineObject {
  Fields!: List<Field>;
  Id!: Value<string>;
  Name!: Value<string>;
  constructor(properties: PipelineObject) {
    Object.assign(this, properties);
  }
}

export class PipelineTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: PipelineTag) {
    Object.assign(this, properties);
  }
}
export interface PipelineProperties {
  PipelineTags?: List<PipelineTag>;
  ParameterObjects?: List<ParameterObject>;
  Description?: Value<string>;
  Activate?: Value<boolean>;
  PipelineObjects?: List<PipelineObject>;
  ParameterValues?: List<ParameterValue>;
  Name: Value<string>;
}
export default class Pipeline extends ResourceBase<PipelineProperties> {
  static Field = Field;
  static ParameterAttribute = ParameterAttribute;
  static ParameterObject = ParameterObject;
  static ParameterValue = ParameterValue;
  static PipelineObject = PipelineObject;
  static PipelineTag = PipelineTag;
  constructor(properties: PipelineProperties) {
    super('AWS::DataPipeline::Pipeline', properties);
  }
}
