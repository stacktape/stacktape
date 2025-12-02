import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class NotificationObjectType {
  SNSTopicArn!: Value<string>;
  BackupVaultEvents!: List<Value<string>>;
  constructor(properties: NotificationObjectType) {
    Object.assign(this, properties);
  }
}
export interface LogicallyAirGappedBackupVaultProperties {
  BackupVaultTags?: { [key: string]: Value<string> };
  BackupVaultName: Value<string>;
  MaxRetentionDays: Value<number>;
  MinRetentionDays: Value<number>;
  Notifications?: NotificationObjectType;
  AccessPolicy?: { [key: string]: any };
}
export default class LogicallyAirGappedBackupVault extends ResourceBase<LogicallyAirGappedBackupVaultProperties> {
  static NotificationObjectType = NotificationObjectType;
  constructor(properties: LogicallyAirGappedBackupVaultProperties) {
    super('AWS::Backup::LogicallyAirGappedBackupVault', properties);
  }
}
