import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class EncryptionConfig {
  KmsKeyArn?: Value<string>;
  SseAlgorithm!: Value<string>;
  constructor(properties: EncryptionConfig) {
    Object.assign(this, properties);
  }
}

export class LogSource {
  Type!: Value<string>;
  Identifier?: Value<string>;
  Name!: Value<string>;
  constructor(properties: LogSource) {
    Object.assign(this, properties);
  }
}
export interface S3TableIntegrationProperties {
  LogSources?: List<LogSource>;
  Encryption: EncryptionConfig;
  RoleArn: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class S3TableIntegration extends ResourceBase<S3TableIntegrationProperties> {
  static EncryptionConfig = EncryptionConfig;
  static LogSource = LogSource;
  constructor(properties: S3TableIntegrationProperties) {
    super('AWS::ObservabilityAdmin::S3TableIntegration', properties);
  }
}
