import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class CentralizationRule {
  Destination!: CentralizationRuleDestination;
  Source!: CentralizationRuleSource;
  constructor(properties: CentralizationRule) {
    Object.assign(this, properties);
  }
}

export class CentralizationRuleDestination {
  Account?: Value<string>;
  DestinationLogsConfiguration?: DestinationLogsConfiguration;
  Region!: Value<string>;
  constructor(properties: CentralizationRuleDestination) {
    Object.assign(this, properties);
  }
}

export class CentralizationRuleSource {
  Scope?: Value<string>;
  SourceLogsConfiguration?: SourceLogsConfiguration;
  Regions!: List<Value<string>>;
  constructor(properties: CentralizationRuleSource) {
    Object.assign(this, properties);
  }
}

export class DestinationLogsConfiguration {
  LogsEncryptionConfiguration?: LogsEncryptionConfiguration;
  BackupConfiguration?: LogsBackupConfiguration;
  constructor(properties: DestinationLogsConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogsBackupConfiguration {
  KmsKeyArn?: Value<string>;
  Region!: Value<string>;
  constructor(properties: LogsBackupConfiguration) {
    Object.assign(this, properties);
  }
}

export class LogsEncryptionConfiguration {
  KmsKeyArn?: Value<string>;
  EncryptionStrategy!: Value<string>;
  EncryptionConflictResolutionStrategy?: Value<string>;
  constructor(properties: LogsEncryptionConfiguration) {
    Object.assign(this, properties);
  }
}

export class SourceLogsConfiguration {
  EncryptedLogGroupStrategy!: Value<string>;
  LogGroupSelectionCriteria!: Value<string>;
  constructor(properties: SourceLogsConfiguration) {
    Object.assign(this, properties);
  }
}
export interface OrganizationCentralizationRuleProperties {
  Rule: CentralizationRule;
  RuleName: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class OrganizationCentralizationRule extends ResourceBase<OrganizationCentralizationRuleProperties> {
  static CentralizationRule = CentralizationRule;
  static CentralizationRuleDestination = CentralizationRuleDestination;
  static CentralizationRuleSource = CentralizationRuleSource;
  static DestinationLogsConfiguration = DestinationLogsConfiguration;
  static LogsBackupConfiguration = LogsBackupConfiguration;
  static LogsEncryptionConfiguration = LogsEncryptionConfiguration;
  static SourceLogsConfiguration = SourceLogsConfiguration;
  constructor(properties: OrganizationCentralizationRuleProperties) {
    super('AWS::ObservabilityAdmin::OrganizationCentralizationRule', properties);
  }
}
