import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EndpointDetails {
  AddressAllocationIds?: List<Value<string>>;
  VpcId?: Value<string>;
  VpcEndpointId?: Value<string>;
  SubnetIds?: List<Value<string>>;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: EndpointDetails) {
    Object.assign(this, properties);
  }
}

export class IdentityProviderDetails {
  Function?: Value<string>;
  DirectoryId?: Value<string>;
  InvocationRole?: Value<string>;
  Url?: Value<string>;
  SftpAuthenticationMethods?: Value<string>;
  constructor(properties: IdentityProviderDetails) {
    Object.assign(this, properties);
  }
}

export class ProtocolDetails {
  As2Transports?: List<Value<string>>;
  PassiveIp?: Value<string>;
  SetStatOption?: Value<string>;
  TlsSessionResumptionMode?: Value<string>;
  constructor(properties: ProtocolDetails) {
    Object.assign(this, properties);
  }
}

export class S3StorageOptions {
  DirectoryListingOptimization?: Value<string>;
  constructor(properties: S3StorageOptions) {
    Object.assign(this, properties);
  }
}

export class WorkflowDetail {
  WorkflowId!: Value<string>;
  ExecutionRole!: Value<string>;
  constructor(properties: WorkflowDetail) {
    Object.assign(this, properties);
  }
}

export class WorkflowDetails {
  OnUpload?: List<WorkflowDetail>;
  OnPartialUpload?: List<WorkflowDetail>;
  constructor(properties: WorkflowDetails) {
    Object.assign(this, properties);
  }
}
export interface ServerProperties {
  IpAddressType?: Value<string>;
  LoggingRole?: Value<string>;
  Protocols?: List<Value<string>>;
  IdentityProviderDetails?: IdentityProviderDetails;
  EndpointDetails?: EndpointDetails;
  StructuredLogDestinations?: List<Value<string>>;
  PreAuthenticationLoginBanner?: Value<string>;
  PostAuthenticationLoginBanner?: Value<string>;
  EndpointType?: Value<string>;
  SecurityPolicyName?: Value<string>;
  ProtocolDetails?: ProtocolDetails;
  S3StorageOptions?: S3StorageOptions;
  WorkflowDetails?: WorkflowDetails;
  Domain?: Value<string>;
  IdentityProviderType?: Value<string>;
  Tags?: List<ResourceTag>;
  Certificate?: Value<string>;
}
export default class Server extends ResourceBase<ServerProperties> {
  static EndpointDetails = EndpointDetails;
  static IdentityProviderDetails = IdentityProviderDetails;
  static ProtocolDetails = ProtocolDetails;
  static S3StorageOptions = S3StorageOptions;
  static WorkflowDetail = WorkflowDetail;
  static WorkflowDetails = WorkflowDetails;
  constructor(properties?: ServerProperties) {
    super('AWS::Transfer::Server', properties || {});
  }
}
