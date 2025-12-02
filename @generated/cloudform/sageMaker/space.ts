import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CodeRepository {
  RepositoryUrl!: Value<string>;
  constructor(properties: CodeRepository) {
    Object.assign(this, properties);
  }
}

export class CustomFileSystem {
  FSxLustreFileSystem?: FSxLustreFileSystem;
  EFSFileSystem?: EFSFileSystem;
  S3FileSystem?: S3FileSystem;
  constructor(properties: CustomFileSystem) {
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

export class EFSFileSystem {
  FileSystemId!: Value<string>;
  constructor(properties: EFSFileSystem) {
    Object.assign(this, properties);
  }
}

export class EbsStorageSettings {
  EbsVolumeSizeInGb!: Value<number>;
  constructor(properties: EbsStorageSettings) {
    Object.assign(this, properties);
  }
}

export class FSxLustreFileSystem {
  FileSystemId!: Value<string>;
  constructor(properties: FSxLustreFileSystem) {
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

export class OwnershipSettings {
  OwnerUserProfileName!: Value<string>;
  constructor(properties: OwnershipSettings) {
    Object.assign(this, properties);
  }
}

export class ResourceSpec {
  LifecycleConfigArn?: Value<string>;
  SageMakerImageArn?: Value<string>;
  InstanceType?: Value<string>;
  SageMakerImageVersionArn?: Value<string>;
  constructor(properties: ResourceSpec) {
    Object.assign(this, properties);
  }
}

export class S3FileSystem {
  S3Uri?: Value<string>;
  constructor(properties: S3FileSystem) {
    Object.assign(this, properties);
  }
}

export class SpaceAppLifecycleManagement {
  IdleSettings?: SpaceIdleSettings;
  constructor(properties: SpaceAppLifecycleManagement) {
    Object.assign(this, properties);
  }
}

export class SpaceCodeEditorAppSettings {
  DefaultResourceSpec?: ResourceSpec;
  AppLifecycleManagement?: SpaceAppLifecycleManagement;
  constructor(properties: SpaceCodeEditorAppSettings) {
    Object.assign(this, properties);
  }
}

export class SpaceIdleSettings {
  IdleTimeoutInMinutes?: Value<number>;
  constructor(properties: SpaceIdleSettings) {
    Object.assign(this, properties);
  }
}

export class SpaceJupyterLabAppSettings {
  DefaultResourceSpec?: ResourceSpec;
  CodeRepositories?: List<CodeRepository>;
  AppLifecycleManagement?: SpaceAppLifecycleManagement;
  constructor(properties: SpaceJupyterLabAppSettings) {
    Object.assign(this, properties);
  }
}

export class SpaceSettings {
  JupyterLabAppSettings?: SpaceJupyterLabAppSettings;
  KernelGatewayAppSettings?: KernelGatewayAppSettings;
  CodeEditorAppSettings?: SpaceCodeEditorAppSettings;
  SpaceManagedResources?: Value<string>;
  RemoteAccess?: Value<string>;
  JupyterServerAppSettings?: JupyterServerAppSettings;
  CustomFileSystems?: List<CustomFileSystem>;
  AppType?: Value<string>;
  SpaceStorageSettings?: SpaceStorageSettings;
  constructor(properties: SpaceSettings) {
    Object.assign(this, properties);
  }
}

export class SpaceSharingSettings {
  SharingType!: Value<string>;
  constructor(properties: SpaceSharingSettings) {
    Object.assign(this, properties);
  }
}

export class SpaceStorageSettings {
  EbsStorageSettings?: EbsStorageSettings;
  constructor(properties: SpaceStorageSettings) {
    Object.assign(this, properties);
  }
}
export interface SpaceProperties {
  DomainId: Value<string>;
  SpaceName: Value<string>;
  SpaceSettings?: SpaceSettings;
  SpaceDisplayName?: Value<string>;
  Tags?: List<ResourceTag>;
  SpaceSharingSettings?: SpaceSharingSettings;
  OwnershipSettings?: OwnershipSettings;
}
export default class Space extends ResourceBase<SpaceProperties> {
  static CodeRepository = CodeRepository;
  static CustomFileSystem = CustomFileSystem;
  static CustomImage = CustomImage;
  static EFSFileSystem = EFSFileSystem;
  static EbsStorageSettings = EbsStorageSettings;
  static FSxLustreFileSystem = FSxLustreFileSystem;
  static JupyterServerAppSettings = JupyterServerAppSettings;
  static KernelGatewayAppSettings = KernelGatewayAppSettings;
  static OwnershipSettings = OwnershipSettings;
  static ResourceSpec = ResourceSpec;
  static S3FileSystem = S3FileSystem;
  static SpaceAppLifecycleManagement = SpaceAppLifecycleManagement;
  static SpaceCodeEditorAppSettings = SpaceCodeEditorAppSettings;
  static SpaceIdleSettings = SpaceIdleSettings;
  static SpaceJupyterLabAppSettings = SpaceJupyterLabAppSettings;
  static SpaceSettings = SpaceSettings;
  static SpaceSharingSettings = SpaceSharingSettings;
  static SpaceStorageSettings = SpaceStorageSettings;
  constructor(properties: SpaceProperties) {
    super('AWS::SageMaker::Space', properties);
  }
}
