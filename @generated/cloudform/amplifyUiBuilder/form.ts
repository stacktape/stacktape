import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class FieldConfig {
  Validations?: List<FieldValidationConfiguration>;
  InputType?: FieldInputConfig;
  Position?: FieldPosition;
  Label?: Value<string>;
  Excluded?: Value<boolean>;
  constructor(properties: FieldConfig) {
    Object.assign(this, properties);
  }
}

export class FieldInputConfig {
  ReadOnly?: Value<boolean>;
  Placeholder?: Value<string>;
  FileUploaderConfig?: FileUploaderFieldConfig;
  IsArray?: Value<boolean>;
  ValueMappings?: ValueMappings;
  DefaultCountryCode?: Value<string>;
  MaxValue?: Value<number>;
  Step?: Value<number>;
  Name?: Value<string>;
  DefaultValue?: Value<string>;
  DescriptiveText?: Value<string>;
  Type!: Value<string>;
  Required?: Value<boolean>;
  MinValue?: Value<number>;
  Value?: Value<string>;
  DefaultChecked?: Value<boolean>;
  constructor(properties: FieldInputConfig) {
    Object.assign(this, properties);
  }
}

export class FieldPosition {
  Below?: Value<string>;
  RightOf?: Value<string>;
  Fixed?: Value<string>;
  constructor(properties: FieldPosition) {
    Object.assign(this, properties);
  }
}

export class FieldValidationConfiguration {
  Type!: Value<string>;
  ValidationMessage?: Value<string>;
  StrValues?: List<Value<string>>;
  NumValues?: List<Value<number>>;
  constructor(properties: FieldValidationConfiguration) {
    Object.assign(this, properties);
  }
}

export class FileUploaderFieldConfig {
  IsResumable?: Value<boolean>;
  ShowThumbnails?: Value<boolean>;
  AcceptedFileTypes!: List<Value<string>>;
  MaxFileCount?: Value<number>;
  MaxSize?: Value<number>;
  AccessLevel!: Value<string>;
  constructor(properties: FileUploaderFieldConfig) {
    Object.assign(this, properties);
  }
}

export class FormButton {
  Position?: FieldPosition;
  Children?: Value<string>;
  Excluded?: Value<boolean>;
  constructor(properties: FormButton) {
    Object.assign(this, properties);
  }
}

export class FormCTA {
  Position?: Value<string>;
  Cancel?: FormButton;
  Submit?: FormButton;
  Clear?: FormButton;
  constructor(properties: FormCTA) {
    Object.assign(this, properties);
  }
}

export class FormDataTypeConfig {
  DataSourceType!: Value<string>;
  DataTypeName!: Value<string>;
  constructor(properties: FormDataTypeConfig) {
    Object.assign(this, properties);
  }
}

export class FormInputBindingPropertiesValue {
  Type?: Value<string>;
  BindingProperties?: FormInputBindingPropertiesValueProperties;
  constructor(properties: FormInputBindingPropertiesValue) {
    Object.assign(this, properties);
  }
}

export class FormInputBindingPropertiesValueProperties {
  Model?: Value<string>;
  constructor(properties: FormInputBindingPropertiesValueProperties) {
    Object.assign(this, properties);
  }
}

export class FormInputValueProperty {
  Concat?: List<FormInputValueProperty>;
  BindingProperties?: FormInputValuePropertyBindingProperties;
  Value?: Value<string>;
  constructor(properties: FormInputValueProperty) {
    Object.assign(this, properties);
  }
}

export class FormInputValuePropertyBindingProperties {
  Field?: Value<string>;
  Property!: Value<string>;
  constructor(properties: FormInputValuePropertyBindingProperties) {
    Object.assign(this, properties);
  }
}

export class FormStyle {
  VerticalGap?: FormStyleConfig;
  OuterPadding?: FormStyleConfig;
  HorizontalGap?: FormStyleConfig;
  constructor(properties: FormStyle) {
    Object.assign(this, properties);
  }
}

export class FormStyleConfig {
  Value?: Value<string>;
  TokenReference?: Value<string>;
  constructor(properties: FormStyleConfig) {
    Object.assign(this, properties);
  }
}

export class SectionalElement {
  Type!: Value<string>;
  Position?: FieldPosition;
  Text?: Value<string>;
  Level?: Value<number>;
  Orientation?: Value<string>;
  Excluded?: Value<boolean>;
  constructor(properties: SectionalElement) {
    Object.assign(this, properties);
  }
}

export class ValueMapping {
  DisplayValue?: FormInputValueProperty;
  Value!: FormInputValueProperty;
  constructor(properties: ValueMapping) {
    Object.assign(this, properties);
  }
}

export class ValueMappings {
  BindingProperties?: { [key: string]: FormInputBindingPropertiesValue };
  Values!: List<ValueMapping>;
  constructor(properties: ValueMappings) {
    Object.assign(this, properties);
  }
}
export interface FormProperties {
  FormActionType?: Value<string>;
  Cta?: FormCTA;
  Fields?: { [key: string]: FieldConfig };
  SchemaVersion?: Value<string>;
  AppId?: Value<string>;
  EnvironmentName?: Value<string>;
  LabelDecorator?: Value<string>;
  SectionalElements?: { [key: string]: SectionalElement };
  DataType?: FormDataTypeConfig;
  Style?: FormStyle;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class Form extends ResourceBase<FormProperties> {
  static FieldConfig = FieldConfig;
  static FieldInputConfig = FieldInputConfig;
  static FieldPosition = FieldPosition;
  static FieldValidationConfiguration = FieldValidationConfiguration;
  static FileUploaderFieldConfig = FileUploaderFieldConfig;
  static FormButton = FormButton;
  static FormCTA = FormCTA;
  static FormDataTypeConfig = FormDataTypeConfig;
  static FormInputBindingPropertiesValue = FormInputBindingPropertiesValue;
  static FormInputBindingPropertiesValueProperties = FormInputBindingPropertiesValueProperties;
  static FormInputValueProperty = FormInputValueProperty;
  static FormInputValuePropertyBindingProperties = FormInputValuePropertyBindingProperties;
  static FormStyle = FormStyle;
  static FormStyleConfig = FormStyleConfig;
  static SectionalElement = SectionalElement;
  static ValueMapping = ValueMapping;
  static ValueMappings = ValueMappings;
  constructor(properties?: FormProperties) {
    super('AWS::AmplifyUIBuilder::Form', properties || {});
  }
}
