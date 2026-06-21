import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AdditionalServiceDetails {
  MCPServer?: RegisteredMCPServerDetails;
  ServiceNow?: RegisteredServiceNowDetails;
  AzureIdentity?: RegisteredAzureIdentityDetails;
  Dynatrace?: RegisteredDynatraceDetails;
  MCPServerSigV4?: RegisteredMCPServerSigV4Details;
  MCPServerSplunk?: RegisteredMCPServerDetails;
  MCPServerNewRelic?: RegisteredNewRelicDetails;
  GitLab?: RegisteredGitLabServiceDetails;
  PagerDuty?: RegisteredPagerDutyDetails;
  constructor(properties: AdditionalServiceDetails) {
    Object.assign(this, properties);
  }
}

export class ApiKeyDetails {
  ApiKeyHeader!: Value<string>;
  ApiKeyValue!: Value<string>;
  ApiKeyName!: Value<string>;
  constructor(properties: ApiKeyDetails) {
    Object.assign(this, properties);
  }
}

export class AzureIdentityServiceDetails {
  WebIdentityRoleArn!: Value<string>;
  TenantId!: Value<string>;
  ClientId!: Value<string>;
  WebIdentityTokenAudiences!: List<Value<string>>;
  constructor(properties: AzureIdentityServiceDetails) {
    Object.assign(this, properties);
  }
}

export class BearerTokenDetails {
  AuthorizationHeader?: Value<string>;
  TokenName!: Value<string>;
  TokenValue!: Value<string>;
  constructor(properties: BearerTokenDetails) {
    Object.assign(this, properties);
  }
}

export class DynatraceAuthorizationConfig {
  OAuthClientCredentials?: OAuthClientDetails;
  constructor(properties: DynatraceAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class DynatraceServiceDetails {
  AuthorizationConfig?: DynatraceAuthorizationConfig;
  AccountUrn!: Value<string>;
  constructor(properties: DynatraceServiceDetails) {
    Object.assign(this, properties);
  }
}

export class GitLabDetails {
  TokenType!: Value<string>;
  TargetUrl!: Value<string>;
  TokenValue!: Value<string>;
  GroupId?: Value<string>;
  constructor(properties: GitLabDetails) {
    Object.assign(this, properties);
  }
}

export class MCPServerAuthorizationConfig {
  ApiKey?: ApiKeyDetails;
  OAuthClientCredentials?: MCPServerOAuthClientCredentialsConfig;
  constructor(properties: MCPServerAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class MCPServerDetails {
  Description?: Value<string>;
  Endpoint!: Value<string>;
  AuthorizationConfig!: MCPServerAuthorizationConfig;
  Name!: Value<string>;
  constructor(properties: MCPServerDetails) {
    Object.assign(this, properties);
  }
}

export class MCPServerOAuthClientCredentialsConfig {
  ClientName?: Value<string>;
  ExchangeUrl!: Value<string>;
  ClientSecret!: Value<string>;
  Scopes?: List<Value<string>>;
  ClientId!: Value<string>;
  ExchangeParameters?: { [key: string]: any };
  constructor(properties: MCPServerOAuthClientCredentialsConfig) {
    Object.assign(this, properties);
  }
}

export class MCPServerSigV4AuthorizationConfig {
  Region!: Value<string>;
  Service!: Value<string>;
  RoleArn!: Value<string>;
  CustomHeaders?: { [key: string]: Value<string> };
  constructor(properties: MCPServerSigV4AuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class MCPServerSigV4Details {
  Description?: Value<string>;
  Endpoint!: Value<string>;
  AuthorizationConfig!: MCPServerSigV4AuthorizationConfig;
  Name!: Value<string>;
  constructor(properties: MCPServerSigV4Details) {
    Object.assign(this, properties);
  }
}

export class MCPServerSplunkAuthorizationConfig {
  BearerToken!: BearerTokenDetails;
  constructor(properties: MCPServerSplunkAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class MCPServerSplunkDetails {
  Description?: Value<string>;
  Endpoint!: Value<string>;
  AuthorizationConfig!: MCPServerSplunkAuthorizationConfig;
  Name!: Value<string>;
  constructor(properties: MCPServerSplunkDetails) {
    Object.assign(this, properties);
  }
}

export class NewRelicApiKeyConfig {
  AlertPolicyIds?: List<Value<string>>;
  ApiKey!: Value<string>;
  AccountId!: Value<string>;
  ApplicationIds?: List<Value<string>>;
  Region!: Value<string>;
  EntityGuids?: List<Value<string>>;
  constructor(properties: NewRelicApiKeyConfig) {
    Object.assign(this, properties);
  }
}

export class NewRelicAuthorizationConfig {
  ApiKey!: NewRelicApiKeyConfig;
  constructor(properties: NewRelicAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class NewRelicServiceDetails {
  AuthorizationConfig!: NewRelicAuthorizationConfig;
  constructor(properties: NewRelicServiceDetails) {
    Object.assign(this, properties);
  }
}

export class OAuthClientDetails {
  ClientId!: Value<string>;
  ClientName?: Value<string>;
  ExchangeParameters?: { [key: string]: any };
  ClientSecret!: Value<string>;
  constructor(properties: OAuthClientDetails) {
    Object.assign(this, properties);
  }
}

export class PagerDutyAuthorizationConfig {
  OAuthClientCredentials?: OAuthClientDetails;
  constructor(properties: PagerDutyAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class PagerDutyDetails {
  Scopes!: List<Value<string>>;
  AuthorizationConfig!: PagerDutyAuthorizationConfig;
  constructor(properties: PagerDutyDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredAzureIdentityDetails {
  WebIdentityRoleArn!: Value<string>;
  TenantId!: Value<string>;
  ClientId!: Value<string>;
  WebIdentityTokenAudiences!: List<Value<string>>;
  constructor(properties: RegisteredAzureIdentityDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredDynatraceDetails {
  AccountUrn!: Value<string>;
  constructor(properties: RegisteredDynatraceDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredGitLabServiceDetails {
  TokenType!: Value<string>;
  TargetUrl!: Value<string>;
  GroupId?: Value<string>;
  constructor(properties: RegisteredGitLabServiceDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredMCPServerDetails {
  AuthorizationMethod!: Value<string>;
  Description?: Value<string>;
  Endpoint!: Value<string>;
  ApiKeyHeader?: Value<string>;
  Name!: Value<string>;
  constructor(properties: RegisteredMCPServerDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredMCPServerSigV4Details {
  Description?: Value<string>;
  Endpoint!: Value<string>;
  Region!: Value<string>;
  Service!: Value<string>;
  RoleArn!: Value<string>;
  CustomHeaders?: { [key: string]: Value<string> };
  Name!: Value<string>;
  constructor(properties: RegisteredMCPServerSigV4Details) {
    Object.assign(this, properties);
  }
}

export class RegisteredNewRelicDetails {
  AccountId!: Value<string>;
  Description?: Value<string>;
  Region!: Value<string>;
  constructor(properties: RegisteredNewRelicDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredPagerDutyDetails {
  Scopes!: List<Value<string>>;
  constructor(properties: RegisteredPagerDutyDetails) {
    Object.assign(this, properties);
  }
}

export class RegisteredServiceNowDetails {
  InstanceUrl!: Value<string>;
  constructor(properties: RegisteredServiceNowDetails) {
    Object.assign(this, properties);
  }
}

export class ServiceDetails {
  MCPServer?: MCPServerDetails;
  ServiceNow?: ServiceNowServiceDetails;
  AzureIdentity?: AzureIdentityServiceDetails;
  Dynatrace?: DynatraceServiceDetails;
  MCPServerSigV4?: MCPServerSigV4Details;
  MCPServerSplunk?: MCPServerSplunkDetails;
  MCPServerNewRelic?: NewRelicServiceDetails;
  GitLab?: GitLabDetails;
  PagerDuty?: PagerDutyDetails;
  constructor(properties: ServiceDetails) {
    Object.assign(this, properties);
  }
}

export class ServiceNowAuthorizationConfig {
  OAuthClientCredentials?: OAuthClientDetails;
  constructor(properties: ServiceNowAuthorizationConfig) {
    Object.assign(this, properties);
  }
}

export class ServiceNowServiceDetails {
  InstanceUrl!: Value<string>;
  AuthorizationConfig?: ServiceNowAuthorizationConfig;
  constructor(properties: ServiceNowServiceDetails) {
    Object.assign(this, properties);
  }
}
export interface ServiceProperties {
  ServiceDetails?: ServiceDetails;
  KmsKeyArn?: Value<string>;
  ServiceType: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Service extends ResourceBase<ServiceProperties> {
  static AdditionalServiceDetails = AdditionalServiceDetails;
  static ApiKeyDetails = ApiKeyDetails;
  static AzureIdentityServiceDetails = AzureIdentityServiceDetails;
  static BearerTokenDetails = BearerTokenDetails;
  static DynatraceAuthorizationConfig = DynatraceAuthorizationConfig;
  static DynatraceServiceDetails = DynatraceServiceDetails;
  static GitLabDetails = GitLabDetails;
  static MCPServerAuthorizationConfig = MCPServerAuthorizationConfig;
  static MCPServerDetails = MCPServerDetails;
  static MCPServerOAuthClientCredentialsConfig = MCPServerOAuthClientCredentialsConfig;
  static MCPServerSigV4AuthorizationConfig = MCPServerSigV4AuthorizationConfig;
  static MCPServerSigV4Details = MCPServerSigV4Details;
  static MCPServerSplunkAuthorizationConfig = MCPServerSplunkAuthorizationConfig;
  static MCPServerSplunkDetails = MCPServerSplunkDetails;
  static NewRelicApiKeyConfig = NewRelicApiKeyConfig;
  static NewRelicAuthorizationConfig = NewRelicAuthorizationConfig;
  static NewRelicServiceDetails = NewRelicServiceDetails;
  static OAuthClientDetails = OAuthClientDetails;
  static PagerDutyAuthorizationConfig = PagerDutyAuthorizationConfig;
  static PagerDutyDetails = PagerDutyDetails;
  static RegisteredAzureIdentityDetails = RegisteredAzureIdentityDetails;
  static RegisteredDynatraceDetails = RegisteredDynatraceDetails;
  static RegisteredGitLabServiceDetails = RegisteredGitLabServiceDetails;
  static RegisteredMCPServerDetails = RegisteredMCPServerDetails;
  static RegisteredMCPServerSigV4Details = RegisteredMCPServerSigV4Details;
  static RegisteredNewRelicDetails = RegisteredNewRelicDetails;
  static RegisteredPagerDutyDetails = RegisteredPagerDutyDetails;
  static RegisteredServiceNowDetails = RegisteredServiceNowDetails;
  static ServiceDetails = ServiceDetails;
  static ServiceNowAuthorizationConfig = ServiceNowAuthorizationConfig;
  static ServiceNowServiceDetails = ServiceNowServiceDetails;
  constructor(properties: ServiceProperties) {
    super('AWS::DevOpsAgent::Service', properties);
  }
}
