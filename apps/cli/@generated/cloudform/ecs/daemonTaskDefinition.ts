import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class ContainerDependency {
  Condition?: Value<string>;
  ContainerName?: Value<string>;
  constructor(properties: ContainerDependency) {
    Object.assign(this, properties);
  }
}

export class DaemonContainerDefinition {
  User?: Value<string>;
  Secrets?: List<Secret>;
  Memory?: Value<number>;
  Privileged?: Value<boolean>;
  StartTimeout?: Value<number>;
  HealthCheck?: HealthCheck;
  Cpu?: Value<number>;
  EntryPoint?: List<Value<string>>;
  ReadonlyRootFilesystem?: Value<boolean>;
  Image!: Value<string>;
  Essential?: Value<boolean>;
  LogConfiguration?: LogConfiguration;
  EnvironmentFiles?: List<EnvironmentFile>;
  Name!: Value<string>;
  FirelensConfiguration?: FirelensConfiguration;
  SystemControls?: List<SystemControl>;
  Interactive?: Value<boolean>;
  Ulimits?: List<Ulimit>;
  StopTimeout?: Value<number>;
  WorkingDirectory?: Value<string>;
  MemoryReservation?: Value<number>;
  RepositoryCredentials?: RepositoryCredentials;
  LinuxParameters?: LinuxParameters;
  RestartPolicy?: RestartPolicy;
  PseudoTerminal?: Value<boolean>;
  MountPoints?: List<MountPoint>;
  DependsOn?: List<ContainerDependency>;
  Command?: List<Value<string>>;
  Environment?: List<KeyValuePair>;
  constructor(properties: DaemonContainerDefinition) {
    Object.assign(this, properties);
  }
}

export class Device {
  HostPath?: Value<string>;
  Permissions?: List<Value<string>>;
  ContainerPath?: Value<string>;
  constructor(properties: Device) {
    Object.assign(this, properties);
  }
}

export class EnvironmentFile {
  Type?: Value<string>;
  Value?: Value<string>;
  constructor(properties: EnvironmentFile) {
    Object.assign(this, properties);
  }
}

export class FirelensConfiguration {
  Options?: { [key: string]: Value<string> };
  Type?: Value<string>;
  constructor(properties: FirelensConfiguration) {
    Object.assign(this, properties);
  }
}

export class HealthCheck {
  Command?: List<Value<string>>;
  Timeout?: Value<number>;
  Retries?: Value<number>;
  Interval?: Value<number>;
  StartPeriod?: Value<number>;
  constructor(properties: HealthCheck) {
    Object.assign(this, properties);
  }
}

export class HostVolumeProperties {
  SourcePath?: Value<string>;
  constructor(properties: HostVolumeProperties) {
    Object.assign(this, properties);
  }
}

export class KernelCapabilities {
  Add?: List<Value<string>>;
  Drop?: List<Value<string>>;
  constructor(properties: KernelCapabilities) {
    Object.assign(this, properties);
  }
}

export class KeyValuePair {
  Value?: Value<string>;
  Name?: Value<string>;
  constructor(properties: KeyValuePair) {
    Object.assign(this, properties);
  }
}

export class LinuxParameters {
  Capabilities?: KernelCapabilities;
  Tmpfs?: List<Tmpfs>;
  Devices?: List<Device>;
  InitProcessEnabled?: Value<boolean>;
  constructor(properties: LinuxParameters) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  SecretOptions?: List<Secret>;
  Options?: { [key: string]: Value<string> };
  LogDriver!: Value<string>;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}

export class MountPoint {
  ReadOnly?: Value<boolean>;
  SourceVolume?: Value<string>;
  ContainerPath?: Value<string>;
  constructor(properties: MountPoint) {
    Object.assign(this, properties);
  }
}

export class RepositoryCredentials {
  CredentialsParameter?: Value<string>;
  constructor(properties: RepositoryCredentials) {
    Object.assign(this, properties);
  }
}

export class RestartPolicy {
  IgnoredExitCodes?: List<Value<number>>;
  RestartAttemptPeriod?: Value<number>;
  Enabled?: Value<boolean>;
  constructor(properties: RestartPolicy) {
    Object.assign(this, properties);
  }
}

export class Secret {
  ValueFrom!: Value<string>;
  Name!: Value<string>;
  constructor(properties: Secret) {
    Object.assign(this, properties);
  }
}

export class SystemControl {
  Value?: Value<string>;
  Namespace?: Value<string>;
  constructor(properties: SystemControl) {
    Object.assign(this, properties);
  }
}

export class Tmpfs {
  Size!: Value<number>;
  ContainerPath?: Value<string>;
  MountOptions?: List<Value<string>>;
  constructor(properties: Tmpfs) {
    Object.assign(this, properties);
  }
}

export class Ulimit {
  SoftLimit!: Value<number>;
  HardLimit!: Value<number>;
  Name!: Value<string>;
  constructor(properties: Ulimit) {
    Object.assign(this, properties);
  }
}

export class Volume {
  Host?: HostVolumeProperties;
  Name?: Value<string>;
  constructor(properties: Volume) {
    Object.assign(this, properties);
  }
}
export interface DaemonTaskDefinitionProperties {
  ExecutionRoleArn?: Value<string>;
  TaskRoleArn?: Value<string>;
  Volumes?: List<Volume>;
  Memory?: Value<string>;
  ContainerDefinitions?: List<DaemonContainerDefinition>;
  Family?: Value<string>;
  Cpu?: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class DaemonTaskDefinition extends ResourceBase<DaemonTaskDefinitionProperties> {
  static ContainerDependency = ContainerDependency;
  static DaemonContainerDefinition = DaemonContainerDefinition;
  static Device = Device;
  static EnvironmentFile = EnvironmentFile;
  static FirelensConfiguration = FirelensConfiguration;
  static HealthCheck = HealthCheck;
  static HostVolumeProperties = HostVolumeProperties;
  static KernelCapabilities = KernelCapabilities;
  static KeyValuePair = KeyValuePair;
  static LinuxParameters = LinuxParameters;
  static LogConfiguration = LogConfiguration;
  static MountPoint = MountPoint;
  static RepositoryCredentials = RepositoryCredentials;
  static RestartPolicy = RestartPolicy;
  static Secret = Secret;
  static SystemControl = SystemControl;
  static Tmpfs = Tmpfs;
  static Ulimit = Ulimit;
  static Volume = Volume;
  constructor(properties?: DaemonTaskDefinitionProperties) {
    super('AWS::ECS::DaemonTaskDefinition', properties || {});
  }
}
