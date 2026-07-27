import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class Dimension {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: Dimension) {
    Object.assign(this, properties);
  }
}

export class MetricTransformation {
  DefaultValue?: Value<number>;
  MetricName!: Value<string>;
  MetricValue!: Value<string>;
  MetricNamespace!: Value<string>;
  Dimensions?: List<Dimension>;
  Unit?: Value<string>;
  constructor(properties: MetricTransformation) {
    Object.assign(this, properties);
  }
}
export interface MetricFilterProperties {
  FieldSelectionCriteria?: Value<string>;
  MetricTransformations: List<MetricTransformation>;
  FilterPattern: Value<string>;
  EmitSystemFieldDimensions?: List<Value<string>>;
  LogGroupName: Value<string>;
  ApplyOnTransformedLogs?: Value<boolean>;
  FilterName?: Value<string>;
}
export default class MetricFilter extends ResourceBase<MetricFilterProperties> {
  static Dimension = Dimension;
  static MetricTransformation = MetricTransformation;
  constructor(properties: MetricFilterProperties) {
    super('AWS::Logs::MetricFilter', properties);
  }
}
