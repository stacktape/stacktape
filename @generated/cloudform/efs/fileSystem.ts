import { ResourceBase } from '../resource';
import { Value, List } from '../dataTypes';
export class BackupPolicy {
  Status!: Value<string>;
  constructor(properties: BackupPolicy) {
    Object.assign(this, properties);
  }
}

export class ElasticFileSystemTag {
  Value!: Value<string>;
  Key!: Value<string>;
  constructor(properties: ElasticFileSystemTag) {
    Object.assign(this, properties);
  }
}

export class FileSystemProtection {
  ReplicationOverwriteProtection?: Value<string>;
  constructor(properties: FileSystemProtection) {
    Object.assign(this, properties);
  }
}

export class LifecyclePolicy {
  TransitionToIA?: Value<string>;
  TransitionToPrimaryStorageClass?: Value<string>;
  TransitionToArchive?: Value<string>;
  constructor(properties: LifecyclePolicy) {
    Object.assign(this, properties);
  }
}

export class ReplicationConfiguration {
  Destinations?: List<ReplicationDestination>;
  constructor(properties: ReplicationConfiguration) {
    Object.assign(this, properties);
  }
}

export class ReplicationDestination {
  Status?: Value<string>;
  KmsKeyId?: Value<string>;
  AvailabilityZoneName?: Value<string>;
  FileSystemId?: Value<string>;
  Region?: Value<string>;
  RoleArn?: Value<string>;
  StatusMessage?: Value<string>;
  constructor(properties: ReplicationDestination) {
    Object.assign(this, properties);
  }
}
export interface FileSystemProperties {
  KmsKeyId?: Value<string>;
  PerformanceMode?: Value<string>;
  Encrypted?: Value<boolean>;
  BypassPolicyLockoutSafetyCheck?: Value<boolean>;
  FileSystemProtection?: FileSystemProtection;
  LifecyclePolicies?: List<LifecyclePolicy>;
  ThroughputMode?: Value<string>;
  FileSystemTags?: List<ElasticFileSystemTag>;
  ProvisionedThroughputInMibps?: Value<number>;
  FileSystemPolicy?: { [key: string]: any };
  AvailabilityZoneName?: Value<string>;
  ReplicationConfiguration?: ReplicationConfiguration;
  BackupPolicy?: BackupPolicy;
}
export default class FileSystem extends ResourceBase<FileSystemProperties> {
  static BackupPolicy = BackupPolicy;
  static ElasticFileSystemTag = ElasticFileSystemTag;
  static FileSystemProtection = FileSystemProtection;
  static LifecyclePolicy = LifecyclePolicy;
  static ReplicationConfiguration = ReplicationConfiguration;
  static ReplicationDestination = ReplicationDestination;
  constructor(properties?: FileSystemProperties) {
    super('AWS::EFS::FileSystem', properties || {});
  }
}
