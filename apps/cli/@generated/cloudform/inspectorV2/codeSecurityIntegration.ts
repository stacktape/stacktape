import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CreateDetails {
  gitlabSelfManaged!: CreateGitLabSelfManagedIntegrationDetail;
  constructor(properties: CreateDetails) {
    Object.assign(this, properties);
  }
}

export class CreateGitLabSelfManagedIntegrationDetail {
  accessToken!: Value<string>;
  instanceUrl!: Value<string>;
  constructor(properties: CreateGitLabSelfManagedIntegrationDetail) {
    Object.assign(this, properties);
  }
}

export class UpdateDetails {
  gitlabSelfManaged?: UpdateGitLabSelfManagedIntegrationDetail;
  github?: UpdateGitHubIntegrationDetail;
  constructor(properties: UpdateDetails) {
    Object.assign(this, properties);
  }
}

export class UpdateGitHubIntegrationDetail {
  code!: Value<string>;
  installationId!: Value<string>;
  constructor(properties: UpdateGitHubIntegrationDetail) {
    Object.assign(this, properties);
  }
}

export class UpdateGitLabSelfManagedIntegrationDetail {
  authCode!: Value<string>;
  constructor(properties: UpdateGitLabSelfManagedIntegrationDetail) {
    Object.assign(this, properties);
  }
}
export interface CodeSecurityIntegrationProperties {
  Type?: Value<string>;
  CreateIntegrationDetails?: CreateDetails;
  UpdateIntegrationDetails?: UpdateDetails;
  Tags?: { [key: string]: Value<string> };
  Name?: Value<string>;
}
export default class CodeSecurityIntegration extends ResourceBase<CodeSecurityIntegrationProperties> {
  static CreateDetails = CreateDetails;
  static CreateGitLabSelfManagedIntegrationDetail = CreateGitLabSelfManagedIntegrationDetail;
  static UpdateDetails = UpdateDetails;
  static UpdateGitHubIntegrationDetail = UpdateGitHubIntegrationDetail;
  static UpdateGitLabSelfManagedIntegrationDetail = UpdateGitLabSelfManagedIntegrationDetail;
  constructor(properties?: CodeSecurityIntegrationProperties) {
    super('AWS::InspectorV2::CodeSecurityIntegration', properties || {});
  }
}
