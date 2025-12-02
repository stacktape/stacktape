import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class TemplateInner {
  HtmlPart?: Value<string>;
  TextPart?: Value<string>;
  TemplateName?: Value<string>;
  SubjectPart!: Value<string>;
  constructor(properties: TemplateInner) {
    Object.assign(this, properties);
  }
}
export interface TemplateProperties {
  Template?: Template;
}
export default class Template extends ResourceBase<TemplateProperties> {
  static Template = TemplateInner;
  constructor(properties?: TemplateProperties) {
    super('AWS::SES::Template', properties || {});
  }
}
