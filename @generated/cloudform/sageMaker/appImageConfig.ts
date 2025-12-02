import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CodeEditorAppImageConfig {
  ContainerConfig?: ContainerConfig;
  constructor(properties: CodeEditorAppImageConfig) {
    Object.assign(this, properties);
  }
}

export class ContainerConfig {
  ContainerEntrypoint?: List<Value<string>>;
  ContainerEnvironmentVariables?: List<CustomImageContainerEnvironmentVariable>;
  ContainerArguments?: List<Value<string>>;
  constructor(properties: ContainerConfig) {
    Object.assign(this, properties);
  }
}

export class CustomImageContainerEnvironmentVariable {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: CustomImageContainerEnvironmentVariable) {
    Object.assign(this, properties);
  }
}

export class FileSystemConfig {
  MountPath?: Value<string>;
  DefaultGid?: Value<number>;
  DefaultUid?: Value<number>;
  constructor(properties: FileSystemConfig) {
    Object.assign(this, properties);
  }
}

export class JupyterLabAppImageConfig {
  ContainerConfig?: ContainerConfig;
  constructor(properties: JupyterLabAppImageConfig) {
    Object.assign(this, properties);
  }
}

export class KernelGatewayImageConfig {
  KernelSpecs!: List<KernelSpec>;
  FileSystemConfig?: FileSystemConfig;
  constructor(properties: KernelGatewayImageConfig) {
    Object.assign(this, properties);
  }
}

export class KernelSpec {
  DisplayName?: Value<string>;
  Name!: Value<string>;
  constructor(properties: KernelSpec) {
    Object.assign(this, properties);
  }
}
export interface AppImageConfigProperties {
  KernelGatewayImageConfig?: KernelGatewayImageConfig;
  CodeEditorAppImageConfig?: CodeEditorAppImageConfig;
  AppImageConfigName: Value<string>;
  JupyterLabAppImageConfig?: JupyterLabAppImageConfig;
  Tags?: List<ResourceTag>;
}
export default class AppImageConfig extends ResourceBase<AppImageConfigProperties> {
  static CodeEditorAppImageConfig = CodeEditorAppImageConfig;
  static ContainerConfig = ContainerConfig;
  static CustomImageContainerEnvironmentVariable = CustomImageContainerEnvironmentVariable;
  static FileSystemConfig = FileSystemConfig;
  static JupyterLabAppImageConfig = JupyterLabAppImageConfig;
  static KernelGatewayImageConfig = KernelGatewayImageConfig;
  static KernelSpec = KernelSpec;
  constructor(properties: AppImageConfigProperties) {
    super('AWS::SageMaker::AppImageConfig', properties);
  }
}
