import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContainerInner {
  ContainerName?: Value<string>;
  Command?: List<Value<string>>;
  Environment?: List<EnvironmentVariable>;
  Ports?: List<PortInfo>;
  Image?: Value<string>;
  constructor(properties: ContainerInner) {
    Object.assign(this, properties);
  }
}

export class ContainerServiceDeployment {
  Containers?: List<Container>;
  PublicEndpoint?: PublicEndpoint;
  constructor(properties: ContainerServiceDeployment) {
    Object.assign(this, properties);
  }
}

export class EcrImagePullerRole {
  PrincipalArn?: Value<string>;
  IsActive?: Value<boolean>;
  constructor(properties: EcrImagePullerRole) {
    Object.assign(this, properties);
  }
}

export class EnvironmentVariable {
  Variable?: Value<string>;
  Value?: Value<string>;
  constructor(properties: EnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export class HealthCheckConfig {
  Path?: Value<string>;
  TimeoutSeconds?: Value<number>;
  SuccessCodes?: Value<string>;
  UnhealthyThreshold?: Value<number>;
  HealthyThreshold?: Value<number>;
  IntervalSeconds?: Value<number>;
  constructor(properties: HealthCheckConfig) {
    Object.assign(this, properties);
  }
}

export class PortInfo {
  Port?: Value<string>;
  Protocol?: Value<string>;
  constructor(properties: PortInfo) {
    Object.assign(this, properties);
  }
}

export class PrivateRegistryAccess {
  EcrImagePullerRole?: EcrImagePullerRole;
  constructor(properties: PrivateRegistryAccess) {
    Object.assign(this, properties);
  }
}

export class PublicDomainName {
  CertificateName?: Value<string>;
  DomainNames?: List<Value<string>>;
  constructor(properties: PublicDomainName) {
    Object.assign(this, properties);
  }
}

export class PublicEndpoint {
  ContainerName?: Value<string>;
  ContainerPort?: Value<number>;
  HealthCheckConfig?: HealthCheckConfig;
  constructor(properties: PublicEndpoint) {
    Object.assign(this, properties);
  }
}
export interface ContainerProperties {
  PublicDomainNames?: List<PublicDomainName>;
  ServiceName: Value<string>;
  PrivateRegistryAccess?: PrivateRegistryAccess;
  ContainerServiceDeployment?: ContainerServiceDeployment;
  IsDisabled?: Value<boolean>;
  Scale: Value<number>;
  Power: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class Container extends ResourceBase<ContainerProperties> {
  static Container = ContainerInner;
  static ContainerServiceDeployment = ContainerServiceDeployment;
  static EcrImagePullerRole = EcrImagePullerRole;
  static EnvironmentVariable = EnvironmentVariable;
  static HealthCheckConfig = HealthCheckConfig;
  static PortInfo = PortInfo;
  static PrivateRegistryAccess = PrivateRegistryAccess;
  static PublicDomainName = PublicDomainName;
  static PublicEndpoint = PublicEndpoint;
  constructor(properties: ContainerProperties) {
    super('AWS::Lightsail::Container', properties);
  }
}
