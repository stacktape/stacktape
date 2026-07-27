import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LoggingConfig {
  LogGroupName?: Value<string>;
  LogRoleArn?: Value<string>;
  constructor(properties: LoggingConfig) {
    Object.assign(this, properties);
  }
}
export interface ResourceVersionProperties {
  ExecutionRoleArn?: Value<string>;
  TypeName: Value<string>;
  LoggingConfig?: LoggingConfig;
  SchemaHandlerPackage: Value<string>;
}
export default class ResourceVersion extends ResourceBase<ResourceVersionProperties> {
  static LoggingConfig = LoggingConfig;
  constructor(properties: ResourceVersionProperties) {
    super('AWS::CloudFormation::ResourceVersion', properties);
  }
}
