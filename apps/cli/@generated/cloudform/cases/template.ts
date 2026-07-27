import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class LayoutConfiguration {
  DefaultLayout?: Value<string>;
  constructor(properties: LayoutConfiguration) {
    Object.assign(this, properties);
  }
}

export class RequiredField {
  FieldId!: Value<string>;
  constructor(properties: RequiredField) {
    Object.assign(this, properties);
  }
}

export class TemplateRule {
  CaseRuleId!: Value<string>;
  FieldId?: Value<string>;
  constructor(properties: TemplateRule) {
    Object.assign(this, properties);
  }
}
export interface TemplateProperties {
  Status?: Value<string>;
  LayoutConfiguration?: LayoutConfiguration;
  DomainId?: Value<string>;
  Description?: Value<string>;
  RequiredFields?: List<RequiredField>;
  Rules?: List<TemplateRule>;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Template extends ResourceBase<TemplateProperties> {
  static LayoutConfiguration = LayoutConfiguration;
  static RequiredField = RequiredField;
  static TemplateRule = TemplateRule;
  constructor(properties: TemplateProperties) {
    super('AWS::Cases::Template', properties);
  }
}
