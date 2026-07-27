import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ModelEnforcement {
  ExcludedModels!: List<Value<string>>;
  IncludedModels!: List<Value<string>>;
  constructor(properties: ModelEnforcement) {
    Object.assign(this, properties);
  }
}

export class SelectiveContentGuarding {
  Messages?: Value<string>;
  System?: Value<string>;
  constructor(properties: SelectiveContentGuarding) {
    Object.assign(this, properties);
  }
}
export interface EnforcedGuardrailConfigurationProperties {
  GuardrailIdentifier: Value<string>;
  GuardrailVersion: Value<string>;
  ModelEnforcement?: ModelEnforcement;
  SelectiveContentGuarding?: SelectiveContentGuarding;
}
export default class EnforcedGuardrailConfiguration extends ResourceBase<EnforcedGuardrailConfigurationProperties> {
  static ModelEnforcement = ModelEnforcement;
  static SelectiveContentGuarding = SelectiveContentGuarding;
  constructor(properties: EnforcedGuardrailConfigurationProperties) {
    super('AWS::Bedrock::EnforcedGuardrailConfiguration', properties);
  }
}
