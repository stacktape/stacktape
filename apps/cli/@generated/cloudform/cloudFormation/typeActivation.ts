import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LoggingConfig {
  LogGroupName?: Value<string>;
  LogRoleArn?: Value<string>;
  constructor(properties: LoggingConfig) {
    Object.assign(this, properties);
  }
}
export interface TypeActivationProperties {
  MajorVersion?: Value<string>;
  ExecutionRoleArn?: Value<string>;
  TypeName?: Value<string>;
  Type?: Value<string>;
  PublicTypeArn?: Value<string>;
  AutoUpdate?: Value<boolean>;
  LoggingConfig?: LoggingConfig;
  PublisherId?: Value<string>;
  VersionBump?: Value<string>;
  TypeNameAlias?: Value<string>;
}
export default class TypeActivation extends ResourceBase<TypeActivationProperties> {
  static LoggingConfig = LoggingConfig;
  constructor(properties?: TypeActivationProperties) {
    super('AWS::CloudFormation::TypeActivation', properties || {});
  }
}
