import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedOptions {
  X12?: X12AdvancedOptions;
  constructor(properties: AdvancedOptions) {
    Object.assign(this, properties);
  }
}

export class FormatOptions {
  X12!: X12Details;
  constructor(properties: FormatOptions) {
    Object.assign(this, properties);
  }
}

export class InputConversion {
  AdvancedOptions?: AdvancedOptions;
  FormatOptions?: FormatOptions;
  FromFormat!: Value<string>;
  constructor(properties: InputConversion) {
    Object.assign(this, properties);
  }
}

export class Mapping {
  TemplateLanguage!: Value<string>;
  Template?: Value<string>;
  constructor(properties: Mapping) {
    Object.assign(this, properties);
  }
}

export class OutputConversion {
  AdvancedOptions?: AdvancedOptions;
  ToFormat!: Value<string>;
  FormatOptions?: FormatOptions;
  constructor(properties: OutputConversion) {
    Object.assign(this, properties);
  }
}

export class SampleDocumentKeys {
  Input?: Value<string>;
  Output?: Value<string>;
  constructor(properties: SampleDocumentKeys) {
    Object.assign(this, properties);
  }
}

export class SampleDocuments {
  BucketName!: Value<string>;
  Keys!: List<SampleDocumentKeys>;
  constructor(properties: SampleDocuments) {
    Object.assign(this, properties);
  }
}

export class X12AdvancedOptions {
  ValidationOptions?: X12ValidationOptions;
  SplitOptions?: X12SplitOptions;
  constructor(properties: X12AdvancedOptions) {
    Object.assign(this, properties);
  }
}

export class X12CodeListValidationRule {
  CodesToAdd?: List<Value<string>>;
  CodesToRemove?: List<Value<string>>;
  ElementId!: Value<string>;
  constructor(properties: X12CodeListValidationRule) {
    Object.assign(this, properties);
  }
}

export class X12Details {
  Version?: Value<string>;
  TransactionSet?: Value<string>;
  constructor(properties: X12Details) {
    Object.assign(this, properties);
  }
}

export class X12ElementLengthValidationRule {
  MinLength!: Value<number>;
  MaxLength!: Value<number>;
  ElementId!: Value<string>;
  constructor(properties: X12ElementLengthValidationRule) {
    Object.assign(this, properties);
  }
}

export class X12ElementRequirementValidationRule {
  Requirement!: Value<string>;
  ElementPosition!: Value<string>;
  constructor(properties: X12ElementRequirementValidationRule) {
    Object.assign(this, properties);
  }
}

export class X12SplitOptions {
  SplitBy?: Value<string>;
  constructor(properties: X12SplitOptions) {
    Object.assign(this, properties);
  }
}

export class X12ValidationOptions {
  ValidationRules?: List<X12ValidationRule>;
  constructor(properties: X12ValidationOptions) {
    Object.assign(this, properties);
  }
}

export class X12ValidationRule {
  ElementRequirementValidationRule?: X12ElementRequirementValidationRule;
  CodeListValidationRule?: X12CodeListValidationRule;
  ElementLengthValidationRule?: X12ElementLengthValidationRule;
  constructor(properties: X12ValidationRule) {
    Object.assign(this, properties);
  }
}
export interface TransformerProperties {
  Status: Value<string>;
  Mapping?: Mapping;
  InputConversion?: InputConversion;
  SampleDocuments?: SampleDocuments;
  OutputConversion?: OutputConversion;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Transformer extends ResourceBase<TransformerProperties> {
  static AdvancedOptions = AdvancedOptions;
  static FormatOptions = FormatOptions;
  static InputConversion = InputConversion;
  static Mapping = Mapping;
  static OutputConversion = OutputConversion;
  static SampleDocumentKeys = SampleDocumentKeys;
  static SampleDocuments = SampleDocuments;
  static X12AdvancedOptions = X12AdvancedOptions;
  static X12CodeListValidationRule = X12CodeListValidationRule;
  static X12Details = X12Details;
  static X12ElementLengthValidationRule = X12ElementLengthValidationRule;
  static X12ElementRequirementValidationRule = X12ElementRequirementValidationRule;
  static X12SplitOptions = X12SplitOptions;
  static X12ValidationOptions = X12ValidationOptions;
  static X12ValidationRule = X12ValidationRule;
  constructor(properties: TransformerProperties) {
    super('AWS::B2BI::Transformer', properties);
  }
}
