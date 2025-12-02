import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AppSyncRuntime {
  RuntimeVersion!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AppSyncRuntime) {
    Object.assign(this, properties);
  }
}

export class LambdaConflictHandlerConfig {
  LambdaConflictHandlerArn?: Value<string>;
  constructor(properties: LambdaConflictHandlerConfig) {
    Object.assign(this, properties);
  }
}

export class SyncConfig {
  ConflictHandler?: Value<string>;
  ConflictDetection!: Value<string>;
  LambdaConflictHandlerConfig?: LambdaConflictHandlerConfig;
  constructor(properties: SyncConfig) {
    Object.assign(this, properties);
  }
}
export interface FunctionConfigurationProperties {
  Description?: Value<string>;
  RequestMappingTemplate?: Value<string>;
  ResponseMappingTemplate?: Value<string>;
  MaxBatchSize?: Value<number>;
  SyncConfig?: SyncConfig;
  Code?: Value<string>;
  Name: Value<string>;
  ResponseMappingTemplateS3Location?: Value<string>;
  Runtime?: AppSyncRuntime;
  CodeS3Location?: Value<string>;
  DataSourceName: Value<string>;
  FunctionVersion?: Value<string>;
  RequestMappingTemplateS3Location?: Value<string>;
  ApiId: Value<string>;
}
export default class FunctionConfiguration extends ResourceBase<FunctionConfigurationProperties> {
  static AppSyncRuntime = AppSyncRuntime;
  static LambdaConflictHandlerConfig = LambdaConflictHandlerConfig;
  static SyncConfig = SyncConfig;
  constructor(properties: FunctionConfigurationProperties) {
    super('AWS::AppSync::FunctionConfiguration', properties);
  }
}
