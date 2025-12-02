import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class HadoopJarStepConfig {
  Args?: List<Value<string>>;
  MainClass?: Value<string>;
  StepProperties?: List<KeyValue>;
  Jar!: Value<string>;
  constructor(properties: HadoopJarStepConfig) {
    Object.assign(this, properties);
  }
}

export class KeyValue {
  Value?: Value<string>;
  Key?: Value<string>;
  constructor(properties: KeyValue) {
    Object.assign(this, properties);
  }
}
export interface StepProperties {
  JobFlowId: Value<string>;
  ActionOnFailure: Value<string>;
  HadoopJarStep: HadoopJarStepConfig;
  Name: Value<string>;
}
export default class Step extends ResourceBase<StepProperties> {
  static HadoopJarStepConfig = HadoopJarStepConfig;
  static KeyValue = KeyValue;
  constructor(properties: StepProperties) {
    super('AWS::EMR::Step', properties);
  }
}
