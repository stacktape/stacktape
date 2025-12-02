import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AppLifecycleManagement {
  IdleSettings?: IdleSettings;
  constructor(properties: AppLifecycleManagement) {
    Object.assign(this, properties);
  }
}

export class CodeEditorAppSettings {
  CustomImages?: List<CustomImage>;
  DefaultResourceSpec?: ResourceSpec;
  LifecycleConfigArns?: List<Value<string>>;
  BuiltInLifecycleConfigArn?: Value<string>;
  AppLifecycleManagement?: AppLifecycleManagement;
  constructor(properties: CodeEditorAppSettings) {
    Object.assign(this, properties);
  }
}

export class CodeRepository {
  RepositoryUrl!: Value<string>;
  constructor(properties: CodeRepository) {
    Object.assign(this, properties);
  }
}

export class CustomFileSystemConfig {
  EFSFileSystemConfig?: EFSFileSystemConfig;
  S3FileSystemConfig?: S3FileSystemConfig;
  FSxLustreFileSystemConfig?: FSxLustreFileSystemConfig;
  constructor(properties: CustomFileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class CustomImage {
  ImageName!: Value<string>;
  AppImageConfigName!: Value<string>;
  ImageVersionNumber?: Value<number>;
  constructor(properties: CustomImage) {
    Object.assign(this, properties);
  }
}

export class CustomPosixUserConfig {
  Uid!: Value<number>;
  Gid!: Value<number>;
  constructor(properties: CustomPosixUserConfig) {
    Object.assign(this, properties);
  }
}

export class DefaultEbsStorageSettings {
  MaximumEbsVolumeSizeInGb!: Value<number>;
  DefaultEbsVolumeSizeInGb!: Value<number>;
  constructor(properties: DefaultEbsStorageSettings) {
    Object.assign(this, properties);
  }
}

export class DefaultSpaceSettings {
  SecurityGroups?: List<Value<string>>;
  JupyterLabAppSettings?: JupyterLabAppSettings;
  KernelGatewayAppSettings?: KernelGatewayAppSettings;
  JupyterServerAppSettings?: JupyterServerAppSettings;
  CustomFileSystemConfigs?: List<CustomFileSystemConfig>;
  ExecutionRole!: Value<string>;
  SpaceStorageSettings?: DefaultSpaceStorageSettings;
  CustomPosixUserConfig?: CustomPosixUserConfig;
  constructor(properties: DefaultSpaceSettings) {
    Object.assign(this, properties);
  }
}

export class DefaultSpaceStorageSettings {
  DefaultEbsStorageSettings?: DefaultEbsStorageSettings;
  constructor(properties: DefaultSpaceStorageSettings) {
    Object.assign(this, properties);
  }
}

export class DockerSettings {
  VpcOnlyTrustedAccounts?: List<Value<string>>;
  EnableDockerAccess?: Value<string>;
  constructor(properties: DockerSettings) {
    Object.assign(this, properties);
  }
}

export class DomainSettings {
  DockerSettings?: DockerSettings;
  IpAddressType?: Value<string>;
  ExecutionRoleIdentityConfig?: Value<string>;
  UnifiedStudioSettings?: UnifiedStudioSettings;
  RStudioServerProDomainSettings?: RStudioServerProDomainSettings;
  SecurityGroupIds?: List<Value<string>>;
  constructor(properties: DomainSettings) {
    Object.assign(this, properties);
  }
}

export class EFSFileSystemConfig {
  FileSystemPath?: Value<string>;
  FileSystemId!: Value<string>;
  constructor(properties: EFSFileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class FSxLustreFileSystemConfig {
  FileSystemPath?: Value<string>;
  FileSystemId!: Value<string>;
  constructor(properties: FSxLustreFileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class HiddenSageMakerImage {
  SageMakerImageName?: Value<string>;
  VersionAliases?: List<Value<string>>;
  constructor(properties: HiddenSageMakerImage) {
    Object.assign(this, properties);
  }
}

export class IdleSettings {
  MaxIdleTimeoutInMinutes?: Value<number>;
  IdleTimeoutInMinutes?: Value<number>;
  MinIdleTimeoutInMinutes?: Value<number>;
  LifecycleManagement?: Value<string>;
  constructor(properties: IdleSettings) {
    Object.assign(this, properties);
  }
}

export class JupyterLabAppSettings {
  CustomImages?: List<CustomImage>;
  DefaultResourceSpec?: ResourceSpec;
  LifecycleConfigArns?: List<Value<string>>;
  BuiltInLifecycleConfigArn?: Value<string>;
  CodeRepositories?: List<CodeRepository>;
  AppLifecycleManagement?: AppLifecycleManagement;
  constructor(properties: JupyterLabAppSettings) {
    Object.assign(this, properties);
  }
}

export class JupyterServerAppSettings {
  DefaultResourceSpec?: ResourceSpec;
  LifecycleConfigArns?: List<Value<string>>;
  constructor(properties: JupyterServerAppSettings) {
    Object.assign(this, properties);
  }
}

export class KernelGatewayAppSettings {
  CustomImages?: List<CustomImage>;
  DefaultResourceSpec?: ResourceSpec;
  LifecycleConfigArns?: List<Value<string>>;
  constructor(properties: KernelGatewayAppSettings) {
    Object.assign(this, properties);
  }
}

export class RSessionAppSettings {
  CustomImages?: List<CustomImage>;
  DefaultResourceSpec?: ResourceSpec;
  constructor(properties: RSessionAppSettings) {
    Object.assign(this, properties);
  }
}

export class RStudioServerProAppSettings {
  AccessStatus?: Value<string>;
  UserGroup?: Value<string>;
  constructor(properties: RStudioServerProAppSettings) {
    Object.assign(this, properties);
  }
}

export class RStudioServerProDomainSettings {
  DomainExecutionRoleArn!: Value<string>;
  RStudioConnectUrl?: Value<string>;
  DefaultResourceSpec?: ResourceSpec;
  RStudioPackageManagerUrl?: Value<string>;
  constructor(properties: RStudioServerProDomainSettings) {
    Object.assign(this, properties);
  }
}

export class ResourceSpec {
  SageMakerImageArn?: Value<string>;
  InstanceType?: Value<string>;
  LifecycleConfigArn?: Value<string>;
  SageMakerImageVersionArn?: Value<string>;
  constructor(properties: ResourceSpec) {
    Object.assign(this, properties);
  }
}

export class S3FileSystemConfig {
  MountPath?: Value<string>;
  S3Uri?: Value<string>;
  constructor(properties: S3FileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class SharingSettings {
  NotebookOutputOption?: Value<string>;
  S3KmsKeyId?: Value<string>;
  S3OutputPath?: Value<string>;
  constructor(properties: SharingSettings) {
    Object.assign(this, properties);
  }
}

export class StudioWebPortalSettings {
  HiddenSageMakerImageVersionAliases?: List<HiddenSageMakerImage>;
  HiddenAppTypes?: List<Value<string>>;
  HiddenInstanceTypes?: List<Value<string>>;
  HiddenMlTools?: List<Value<string>>;
  constructor(properties: StudioWebPortalSettings) {
    Object.assign(this, properties);
  }
}

export class UnifiedStudioSettings {
  EnvironmentId?: Value<string>;
  DomainId?: Value<string>;
  ProjectS3Path?: Value<string>;
  DomainAccountId?: Value<string>;
  ProjectId?: Value<string>;
  DomainRegion?: Value<string>;
  StudioWebPortalAccess?: Value<string>;
  constructor(properties: UnifiedStudioSettings) {
    Object.assign(this, properties);
  }
}

export class UserSettings {
  SecurityGroups?: List<Value<string>>;
  JupyterLabAppSettings?: JupyterLabAppSettings;
  KernelGatewayAppSettings?: KernelGatewayAppSettings;
  StudioWebPortalSettings?: StudioWebPortalSettings;
  CustomFileSystemConfigs?: List<CustomFileSystemConfig>;
  CustomPosixUserConfig?: CustomPosixUserConfig;
  CodeEditorAppSettings?: CodeEditorAppSettings;
  RStudioServerProAppSettings?: RStudioServerProAppSettings;
  StudioWebPortal?: Value<string>;
  RSessionAppSettings?: RSessionAppSettings;
  JupyterServerAppSettings?: JupyterServerAppSettings;
  AutoMountHomeEFS?: Value<string>;
  DefaultLandingUri?: Value<string>;
  ExecutionRole!: Value<string>;
  SpaceStorageSettings?: DefaultSpaceStorageSettings;
  SharingSettings?: SharingSettings;
  constructor(properties: UserSettings) {
    Object.assign(this, properties);
  }
}
export interface DomainProperties {
  AppNetworkAccessType?: Value<string>;
  DefaultSpaceSettings?: DefaultSpaceSettings;
  KmsKeyId?: Value<string>;
  VpcId?: Value<string>;
  DomainName: Value<string>;
  AppSecurityGroupManagement?: Value<string>;
  DefaultUserSettings: UserSettings;
  SubnetIds?: List<Value<string>>;
  AuthMode: Value<string>;
  Tags?: List<ResourceTag>;
  DomainSettings?: DomainSettings;
  TagPropagation?: Value<string>;
}
export default class Domain extends ResourceBase<DomainProperties> {
  static AppLifecycleManagement = AppLifecycleManagement;
  static CodeEditorAppSettings = CodeEditorAppSettings;
  static CodeRepository = CodeRepository;
  static CustomFileSystemConfig = CustomFileSystemConfig;
  static CustomImage = CustomImage;
  static CustomPosixUserConfig = CustomPosixUserConfig;
  static DefaultEbsStorageSettings = DefaultEbsStorageSettings;
  static DefaultSpaceSettings = DefaultSpaceSettings;
  static DefaultSpaceStorageSettings = DefaultSpaceStorageSettings;
  static DockerSettings = DockerSettings;
  static DomainSettings = DomainSettings;
  static EFSFileSystemConfig = EFSFileSystemConfig;
  static FSxLustreFileSystemConfig = FSxLustreFileSystemConfig;
  static HiddenSageMakerImage = HiddenSageMakerImage;
  static IdleSettings = IdleSettings;
  static JupyterLabAppSettings = JupyterLabAppSettings;
  static JupyterServerAppSettings = JupyterServerAppSettings;
  static KernelGatewayAppSettings = KernelGatewayAppSettings;
  static RSessionAppSettings = RSessionAppSettings;
  static RStudioServerProAppSettings = RStudioServerProAppSettings;
  static RStudioServerProDomainSettings = RStudioServerProDomainSettings;
  static ResourceSpec = ResourceSpec;
  static S3FileSystemConfig = S3FileSystemConfig;
  static SharingSettings = SharingSettings;
  static StudioWebPortalSettings = StudioWebPortalSettings;
  static UnifiedStudioSettings = UnifiedStudioSettings;
  static UserSettings = UserSettings;
  constructor(properties: DomainProperties) {
    super('AWS::SageMaker::Domain', properties);
  }
}
