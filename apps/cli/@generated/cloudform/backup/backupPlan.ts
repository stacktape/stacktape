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
  ScanSettings?: List<ScanSettingResourceType>;
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
  StartWindowMinutes?: Value<number>;
  ScheduleExpressionTimezone?: Value<string>;
  TargetLogicallyAirGappedBackupVaultArn?: Value<string>;
  ScanActions?: List<ScanActionResourceType>;
  TargetBackupVault!: Value<string>;
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
  MoveToColdStorageAfterDays?: Value<number>;
  DeleteAfterDays?: Value<number>;
  constructor(properties: LifecycleResourceType) {
    Object.assign(this, properties);
  }
}

export class ScanActionResourceType {
  ScanMode?: Value<string>;
  MalwareScanner?: Value<string>;
  constructor(properties: ScanActionResourceType) {
    Object.assign(this, properties);
  }
}

export class ScanSettingResourceType {
  ResourceTypes?: List<Value<string>>;
  MalwareScanner?: Value<string>;
  ScannerRoleArn?: Value<string>;
  constructor(properties: ScanSettingResourceType) {
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
  static ScanActionResourceType = ScanActionResourceType;
  static ScanSettingResourceType = ScanSettingResourceType;
  constructor(properties: BackupPlanProperties) {
    super('AWS::Backup::BackupPlan', properties);
  }
}
