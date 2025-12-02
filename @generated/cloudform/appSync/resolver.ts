import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AppSyncRuntime {
  RuntimeVersion!: Value<string>;
  Name!: Value<string>;
  constructor(properties: AppSyncRuntime) {
    Object.assign(this, properties);
  }
}

export class CachingConfig {
  CachingKeys?: List<Value<string>>;
  Ttl!: Value<number>;
  constructor(properties: CachingConfig) {
    Object.assign(this, properties);
  }
}

export class LambdaConflictHandlerConfig {
  LambdaConflictHandlerArn?: Value<string>;
  constructor(properties: LambdaConflictHandlerConfig) {
    Object.assign(this, properties);
  }
}

export class PipelineConfig {
  Functions?: List<Value<string>>;
  constructor(properties: PipelineConfig) {
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
export interface ResolverProperties {
  TypeName: Value<string>;
  PipelineConfig?: PipelineConfig;
  RequestMappingTemplate?: Value<string>;
  ResponseMappingTemplate?: Value<string>;
  MaxBatchSize?: Value<number>;
  SyncConfig?: SyncConfig;
  Code?: Value<string>;
  MetricsConfig?: Value<string>;
  ResponseMappingTemplateS3Location?: Value<string>;
  Runtime?: AppSyncRuntime;
  CodeS3Location?: Value<string>;
  DataSourceName?: Value<string>;
  Kind?: Value<string>;
  CachingConfig?: CachingConfig;
  RequestMappingTemplateS3Location?: Value<string>;
  ApiId: Value<string>;
  FieldName: Value<string>;
}
export default class Resolver extends ResourceBase<ResolverProperties> {
  static AppSyncRuntime = AppSyncRuntime;
  static CachingConfig = CachingConfig;
  static LambdaConflictHandlerConfig = LambdaConflictHandlerConfig;
  static PipelineConfig = PipelineConfig;
  static SyncConfig = SyncConfig;
  constructor(properties: ResolverProperties) {
    super('AWS::AppSync::Resolver', properties);
  }
}
