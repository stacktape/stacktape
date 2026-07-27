import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LoggingConfig {
  LogGroupName?: Value<string>;
  LogRoleArn?: Value<string>;
  constructor(properties: LoggingConfig) {
    Object.assign(this, properties);
  }
}
export interface HookVersionProperties {
  ExecutionRoleArn?: Value<string>;
  TypeName: Value<string>;
  LoggingConfig?: LoggingConfig;
  SchemaHandlerPackage: Value<string>;
}
export default class HookVersion extends ResourceBase<HookVersionProperties> {
  static LoggingConfig = LoggingConfig;
  constructor(properties: HookVersionProperties) {
    super('AWS::CloudFormation::HookVersion', properties);
  }
}
