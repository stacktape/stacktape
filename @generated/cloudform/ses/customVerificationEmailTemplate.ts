import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';

export interface CustomVerificationEmailTemplateProperties {
  FromEmailAddress: Value<string>;
  TemplateContent: Value<string>;
  SuccessRedirectionURL: Value<string>;
  TemplateName: Value<string>;
  FailureRedirectionURL: Value<string>;
  TemplateSubject: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class CustomVerificationEmailTemplate extends ResourceBase<CustomVerificationEmailTemplateProperties> {
  constructor(properties: CustomVerificationEmailTemplateProperties) {
    super('AWS::SES::CustomVerificationEmailTemplate', properties);
  }
}
