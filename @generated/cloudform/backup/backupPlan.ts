import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class AdvancedBackupSettingResourceType {
  BackupOptions!: { [key: string]: any };
  ResourceType!: Value<string>;
  constructor(properties: AdvancedBackupSettingResourceType) {
    Object.assign(this, properties);
  }
}

export class BackupPlanResourceType {
  BackupPlanName!: Value<string>;
  AdvancedBackupSettings?: List<AdvancedBackupSettingResourceType>;
  BackupPlanRule!: List<BackupRuleResourceType>;
  constructor(properties: BackupPlanResourceType) {
    Object.assign(this, properties);
  }
}

export class BackupRuleResourceType {
  CompletionWindowMinutes?: Value<number>;
  ScheduleExpression?: Value<string>;
  RecoveryPointTags?: { [key: string]: Value<string> };
  CopyActions?: List<CopyActionResourceType>;
  EnableContinuousBackup?: Value<boolean>;
  Lifecycle?: LifecycleResourceType;
  IndexActions?: List<IndexActionsResourceType>;
  TargetBackupVault!: Value<string>;
  StartWindowMinutes?: Value<number>;
  ScheduleExpressionTimezone?: Value<string>;
  RuleName!: Value<string>;
  constructor(properties: BackupRuleResourceType) {
    Object.assign(this, properties);
  }
}

export class CopyActionResourceType {
  Lifecycle?: LifecycleResourceType;
  DestinationBackupVaultArn!: Value<string>;
  constructor(properties: CopyActionResourceType) {
    Object.assign(this, properties);
  }
}

export class IndexActionsResourceType {
  ResourceTypes?: List<Value<string>>;
  constructor(properties: IndexActionsResourceType) {
    Object.assign(this, properties);
  }
}

export class LifecycleResourceType {
  OptInToArchiveForSupportedResources?: Value<boolean>;
  DeleteAfterDays?: Value<number>;
  MoveToColdStorageAfterDays?: Value<number>;
  constructor(properties: LifecycleResourceType) {
    Object.assign(this, properties);
  }
}
export interface BackupPlanProperties {
  BackupPlan: BackupPlanResourceType;
  BackupPlanTags?: { [key: string]: Value<string> };
}
export default class BackupPlan extends ResourceBase<BackupPlanProperties> {
  static AdvancedBackupSettingResourceType = AdvancedBackupSettingResourceType;
  static BackupPlanResourceType = BackupPlanResourceType;
  static BackupRuleResourceType = BackupRuleResourceType;
  static CopyActionResourceType = CopyActionResourceType;
  static IndexActionsResourceType = IndexActionsResourceType;
  static LifecycleResourceType = LifecycleResourceType;
  constructor(properties: BackupPlanProperties) {
    super('AWS::Backup::BackupPlan', properties);
  }
}
