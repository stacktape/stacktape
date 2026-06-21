import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CustomDocumentEnrichmentConfiguration {
  InlineConfigurations?: List<InlineCustomDocumentEnrichmentConfiguration>;
  PreExtractionHookConfiguration?: HookConfiguration;
  PostExtractionHookConfiguration?: HookConfiguration;
  RoleArn?: Value<string>;
  constructor(properties: CustomDocumentEnrichmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class DataSourceConfiguration {
  TemplateConfiguration?: TemplateConfiguration;
  constructor(properties: DataSourceConfiguration) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeCondition {
  Operator!: Value<string>;
  ConditionDocumentAttributeKey!: Value<string>;
  ConditionOnValue?: DocumentAttributeValue;
  constructor(properties: DocumentAttributeCondition) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeTarget {
  TargetDocumentAttributeKey!: Value<string>;
  TargetDocumentAttributeValueDeletion?: Value<boolean>;
  TargetDocumentAttributeValue?: DocumentAttributeValue;
  constructor(properties: DocumentAttributeTarget) {
    Object.assign(this, properties);
  }
}

export class DocumentAttributeValue {
  LongValue?: Value<number>;
  StringValue?: Value<string>;
  StringListValue?: List<Value<string>>;
  DateValue?: Value<string>;
  constructor(properties: DocumentAttributeValue) {
    Object.assign(this, properties);
  }
}

export class HookConfiguration {
  S3Bucket!: Value<string>;
  InvocationCondition?: DocumentAttributeCondition;
  LambdaArn!: Value<string>;
  constructor(properties: HookConfiguration) {
    Object.assign(this, properties);
  }
}

export class InlineCustomDocumentEnrichmentConfiguration {
  Condition?: DocumentAttributeCondition;
  Target?: DocumentAttributeTarget;
  DocumentContentDeletion?: Value<boolean>;
  constructor(properties: InlineCustomDocumentEnrichmentConfiguration) {
    Object.assign(this, properties);
  }
}

export class TemplateConfiguration {
  Template!: { [key: string]: any };
  constructor(properties: TemplateConfiguration) {
    Object.assign(this, properties);
  }
}
export interface DataSourceProperties {
  CustomDocumentEnrichmentConfiguration?: CustomDocumentEnrichmentConfiguration;
  IndexId: Value<string>;
  LanguageCode?: Value<string>;
  Type: Value<string>;
  Description?: Value<string>;
  Schedule?: Value<string>;
  DataSourceConfiguration?: DataSourceConfiguration;
  RoleArn?: Value<string>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class DataSource extends ResourceBase<DataSourceProperties> {
  static CustomDocumentEnrichmentConfiguration = CustomDocumentEnrichmentConfiguration;
  static DataSourceConfiguration = DataSourceConfiguration;
  static DocumentAttributeCondition = DocumentAttributeCondition;
  static DocumentAttributeTarget = DocumentAttributeTarget;
  static DocumentAttributeValue = DocumentAttributeValue;
  static HookConfiguration = HookConfiguration;
  static InlineCustomDocumentEnrichmentConfiguration = InlineCustomDocumentEnrichmentConfiguration;
  static TemplateConfiguration = TemplateConfiguration;
  constructor(properties: DataSourceProperties) {
    super('AWS::Kendra::DataSource', properties);
  }
}
