import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConformancePackInputParameter {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: ConformancePackInputParameter) {
    Object.assign(this, properties);
  }
}

export class TemplateSSMDocumentDetails {
  DocumentVersion?: Value<string>;
  DocumentName?: Value<string>;
  constructor(properties: TemplateSSMDocumentDetails) {
    Object.assign(this, properties);
  }
}
export interface ConformancePackProperties {
  ConformancePackInputParameters?: List<ConformancePackInputParameter>;
  TemplateSSMDocumentDetails?: TemplateSSMDocumentDetails;
  DeliveryS3Bucket?: Value<string>;
  ConformancePackName: Value<string>;
  DeliveryS3KeyPrefix?: Value<string>;
  TemplateBody?: Value<string>;
  TemplateS3Uri?: Value<string>;
}
export default class ConformancePack extends ResourceBase<ConformancePackProperties> {
  static ConformancePackInputParameter = ConformancePackInputParameter;
  static TemplateSSMDocumentDetails = TemplateSSMDocumentDetails;
  constructor(properties: ConformancePackProperties) {
    super('AWS::Config::ConformancePack', properties);
  }
}
