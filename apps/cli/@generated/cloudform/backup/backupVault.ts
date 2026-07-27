import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class LockConfigurationType {
  ChangeableForDays?: Value<number>;
  MaxRetentionDays?: Value<number>;
  MinRetentionDays!: Value<number>;
  constructor(properties: LockConfigurationType) {
    Object.assign(this, properties);
  }
}

export class NotificationObjectType {
  SNSTopicArn!: Value<string>;
  BackupVaultEvents!: List<Value<string>>;
  constructor(properties: NotificationObjectType) {
    Object.assign(this, properties);
  }
}
export interface BackupVaultProperties {
  BackupVaultTags?: { [key: string]: Value<string> };
  BackupVaultName: Value<string>;
  EncryptionKeyArn?: Value<string>;
  LockConfiguration?: LockConfigurationType;
  Notifications?: NotificationObjectType;
  AccessPolicy?: { [key: string]: any };
}
export default class BackupVault extends ResourceBase<BackupVaultProperties> {
  static LockConfigurationType = LockConfigurationType;
  static NotificationObjectType = NotificationObjectType;
  constructor(properties: BackupVaultProperties) {
    super('AWS::Backup::BackupVault', properties);
  }
}
