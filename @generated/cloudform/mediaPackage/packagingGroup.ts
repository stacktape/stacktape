import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Authorization {
  SecretsRoleArn!: Value<string>;
  CdnIdentifierSecret!: Value<string>;
  constructor(properties: Authorization) {
    Object.assign(this, properties);
  }
}

export class LogConfiguration {
  LogGroupName?: Value<string>;
  constructor(properties: LogConfiguration) {
    Object.assign(this, properties);
  }
}
export interface PackagingGroupProperties {
  Authorization?: Authorization;
  Id: Value<string>;
  EgressAccessLogs?: LogConfiguration;
  Tags?: List<ResourceTag>;
}
export default class PackagingGroup extends ResourceBase<PackagingGroupProperties> {
  static Authorization = Authorization;
  static LogConfiguration = LogConfiguration;
  constructor(properties: PackagingGroupProperties) {
    super('AWS::MediaPackage::PackagingGroup', properties);
  }
}
