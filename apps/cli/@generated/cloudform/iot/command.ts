import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AwsJsonSubstitutionCommandPreprocessorConfig {
  OutputFormat!: Value<string>;
  constructor(properties: AwsJsonSubstitutionCommandPreprocessorConfig) {
    Object.assign(this, properties);
  }
}

export class CommandParameter {
  DefaultValue?: CommandParameterValue;
  Type?: Value<string>;
  Description?: Value<string>;
  Value?: CommandParameterValue;
  ValueConditions?: List<CommandParameterValueCondition>;
  Name!: Value<string>;
  constructor(properties: CommandParameter) {
    Object.assign(this, properties);
  }
}

export class CommandParameterValue {
  B?: Value<boolean>;
  S?: Value<string>;
  D?: Value<number>;
  BIN?: Value<string>;
  UL?: Value<string>;
  I?: Value<number>;
  L?: Value<string>;
  constructor(properties: CommandParameterValue) {
    Object.assign(this, properties);
  }
}

export class CommandParameterValueComparisonOperand {
  NumberRange?: CommandParameterValueNumberRange;
  Numbers?: List<Value<string>>;
  Number?: Value<string>;
  String?: Value<string>;
  Strings?: List<Value<string>>;
  constructor(properties: CommandParameterValueComparisonOperand) {
    Object.assign(this, properties);
  }
}

export class CommandParameterValueCondition {
  ComparisonOperator!: Value<string>;
  Operand!: CommandParameterValueComparisonOperand;
  constructor(properties: CommandParameterValueCondition) {
    Object.assign(this, properties);
  }
}

export class CommandParameterValueNumberRange {
  Min!: Value<string>;
  Max!: Value<string>;
  constructor(properties: CommandParameterValueNumberRange) {
    Object.assign(this, properties);
  }
}

export class CommandPayload {
  ContentType?: Value<string>;
  Content?: Value<string>;
  constructor(properties: CommandPayload) {
    Object.assign(this, properties);
  }
}

export class CommandPreprocessor {
  AwsJsonSubstitution?: AwsJsonSubstitutionCommandPreprocessorConfig;
  constructor(properties: CommandPreprocessor) {
    Object.assign(this, properties);
  }
}
export interface CommandProperties {
  PayloadTemplate?: Value<string>;
  Description?: Value<string>;
  LastUpdatedAt?: Value<string>;
  CreatedAt?: Value<string>;
  MandatoryParameters?: List<CommandParameter>;
  Namespace?: Value<string>;
  RoleArn?: Value<string>;
  Deprecated?: Value<boolean>;
  DisplayName?: Value<string>;
  Payload?: CommandPayload;
  CommandId: Value<string>;
  Preprocessor?: CommandPreprocessor;
  PendingDeletion?: Value<boolean>;
  Tags?: List<ResourceTag>;
}
export default class Command extends ResourceBase<CommandProperties> {
  static AwsJsonSubstitutionCommandPreprocessorConfig = AwsJsonSubstitutionCommandPreprocessorConfig;
  static CommandParameter = CommandParameter;
  static CommandParameterValue = CommandParameterValue;
  static CommandParameterValueComparisonOperand = CommandParameterValueComparisonOperand;
  static CommandParameterValueCondition = CommandParameterValueCondition;
  static CommandParameterValueNumberRange = CommandParameterValueNumberRange;
  static CommandPayload = CommandPayload;
  static CommandPreprocessor = CommandPreprocessor;
  constructor(properties: CommandProperties) {
    super('AWS::IoT::Command', properties);
  }
}
