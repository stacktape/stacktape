import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomPattern {
  KeywordRegex?: Value<string>;
  PatternDescription?: Value<string>;
  PatternName!: Value<string>;
  PatternRegex!: Value<string>;
  constructor(properties: CustomPattern) {
    Object.assign(this, properties);
  }
}

export class InlineRedactionConfiguration {
  InlineRedactionPatterns!: List<InlineRedactionPattern>;
  GlobalConfidenceLevel?: Value<number>;
  GlobalExemptUrls?: List<Value<string>>;
  GlobalEnforcedUrls?: List<Value<string>>;
  constructor(properties: InlineRedactionConfiguration) {
    Object.assign(this, properties);
  }
}

export class InlineRedactionPattern {
  EnforcedUrls?: List<Value<string>>;
  ConfidenceLevel?: Value<number>;
  CustomPattern?: CustomPattern;
  ExemptUrls?: List<Value<string>>;
  BuiltInPatternId?: Value<string>;
  RedactionPlaceHolder!: RedactionPlaceHolder;
  constructor(properties: InlineRedactionPattern) {
    Object.assign(this, properties);
  }
}

export class RedactionPlaceHolder {
  RedactionPlaceHolderType!: Value<string>;
  RedactionPlaceHolderText?: Value<string>;
  constructor(properties: RedactionPlaceHolder) {
    Object.assign(this, properties);
  }
}
export interface DataProtectionSettingsProperties {
  InlineRedactionConfiguration?: InlineRedactionConfiguration;
  Description?: Value<string>;
  CustomerManagedKey?: Value<string>;
  AdditionalEncryptionContext?: { [key: string]: Value<string> };
  DisplayName?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DataProtectionSettings extends ResourceBase<DataProtectionSettingsProperties> {
  static CustomPattern = CustomPattern;
  static InlineRedactionConfiguration = InlineRedactionConfiguration;
  static InlineRedactionPattern = InlineRedactionPattern;
  static RedactionPlaceHolder = RedactionPlaceHolder;
  constructor(properties?: DataProtectionSettingsProperties) {
    super('AWS::WorkSpacesWeb::DataProtectionSettings', properties || {});
  }
}
