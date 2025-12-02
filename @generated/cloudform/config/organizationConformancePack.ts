import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class ConformancePackInputParameter {
  ParameterValue!: Value<string>;
  ParameterName!: Value<string>;
  constructor(properties: ConformancePackInputParameter) {
    Object.assign(this, properties);
  }
}
export interface OrganizationConformancePackProperties {
  ConformancePackInputParameters?: List<ConformancePackInputParameter>;
  DeliveryS3Bucket?: Value<string>;
  ExcludedAccounts?: List<Value<string>>;
  DeliveryS3KeyPrefix?: Value<string>;
  TemplateBody?: Value<string>;
  OrganizationConformancePackName: Value<string>;
  TemplateS3Uri?: Value<string>;
}
export default class OrganizationConformancePack extends ResourceBase<OrganizationConformancePackProperties> {
  static ConformancePackInputParameter = ConformancePackInputParameter;
  constructor(properties: OrganizationConformancePackProperties) {
    super('AWS::Config::OrganizationConformancePack', properties);
  }
}
