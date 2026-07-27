import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CfnStackParameter {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: CfnStackParameter) {
    Object.assign(this, properties);
  }
}

export class CfnTemplateProviderDetail {
  TemplateURL!: Value<string>;
  Parameters?: List<CfnStackParameter>;
  TemplateName!: Value<string>;
  RoleARN?: Value<string>;
  constructor(properties: CfnTemplateProviderDetail) {
    Object.assign(this, properties);
  }
}

export class ProvisioningParameter {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ProvisioningParameter) {
    Object.assign(this, properties);
  }
}

export class ServiceCatalogProvisionedProductDetails {
  ProvisionedProductStatusMessage?: Value<string>;
  ProvisionedProductId?: Value<string>;
  constructor(properties: ServiceCatalogProvisionedProductDetails) {
    Object.assign(this, properties);
  }
}

export class ServiceCatalogProvisioningDetails {
  PathId?: Value<string>;
  ProvisioningParameters?: List<ProvisioningParameter>;
  ProductId!: Value<string>;
  ProvisioningArtifactId?: Value<string>;
  constructor(properties: ServiceCatalogProvisioningDetails) {
    Object.assign(this, properties);
  }
}

export class TemplateProviderDetail {
  CfnTemplateProviderDetail!: CfnTemplateProviderDetail;
  constructor(properties: TemplateProviderDetail) {
    Object.assign(this, properties);
  }
}
export interface ProjectProperties {
  ProjectName: Value<string>;
  TemplateProviderDetails?: List<TemplateProviderDetail>;
  ServiceCatalogProvisionedProductDetails?: ServiceCatalogProvisionedProductDetails;
  ServiceCatalogProvisioningDetails?: ServiceCatalogProvisioningDetails;
  ProjectDescription?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Project extends ResourceBase<ProjectProperties> {
  static CfnStackParameter = CfnStackParameter;
  static CfnTemplateProviderDetail = CfnTemplateProviderDetail;
  static ProvisioningParameter = ProvisioningParameter;
  static ServiceCatalogProvisionedProductDetails = ServiceCatalogProvisionedProductDetails;
  static ServiceCatalogProvisioningDetails = ServiceCatalogProvisioningDetails;
  static TemplateProviderDetail = TemplateProviderDetail;
  constructor(properties: ProjectProperties) {
    super('AWS::SageMaker::Project', properties);
  }
}
