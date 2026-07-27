import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class AggregateConfiguration {
  Aggregates?: List<Value<string>>;
  ConstituentsPerAggregate?: Value<number>;
  constructor(properties: AggregateConfiguration) {
    Object.assign(this, properties);
  }
}

export class AutocommitPeriod {
  Type!: Value<string>;
  Value?: Value<number>;
  constructor(properties: AutocommitPeriod) {
    Object.assign(this, properties);
  }
}

export class ClientConfigurations {
  Options!: List<Value<string>>;
  Clients!: Value<string>;
  constructor(properties: ClientConfigurations) {
    Object.assign(this, properties);
  }
}

export class NfsExports {
  ClientConfigurations!: List<ClientConfigurations>;
  constructor(properties: NfsExports) {
    Object.assign(this, properties);
  }
}

export class OntapConfiguration {
  JunctionPath?: Value<string>;
  StorageVirtualMachineId!: Value<string>;
  TieringPolicy?: TieringPolicy;
  SizeInMegabytes?: Value<string>;
  VolumeStyle?: Value<string>;
  SizeInBytes?: Value<string>;
  SecurityStyle?: Value<string>;
  SnaplockConfiguration?: SnaplockConfiguration;
  AggregateConfiguration?: AggregateConfiguration;
  SnapshotPolicy?: Value<string>;
  StorageEfficiencyEnabled?: Value<string>;
  CopyTagsToBackups?: Value<string>;
  OntapVolumeType?: Value<string>;
  constructor(properties: OntapConfiguration) {
    Object.assign(this, properties);
  }
}

export class OpenZFSConfiguration {
  ReadOnly?: Value<boolean>;
  Options?: List<Value<string>>;
  DataCompressionType?: Value<string>;
  NfsExports?: List<NfsExports>;
  StorageCapacityQuotaGiB?: Value<number>;
  CopyTagsToSnapshots?: Value<boolean>;
  ParentVolumeId!: Value<string>;
  StorageCapacityReservationGiB?: Value<number>;
  RecordSizeKiB?: Value<number>;
  OriginSnapshot?: OriginSnapshot;
  UserAndGroupQuotas?: List<UserAndGroupQuotas>;
  constructor(properties: OpenZFSConfiguration) {
    Object.assign(this, properties);
  }
}

export class OriginSnapshot {
  CopyStrategy!: Value<string>;
  SnapshotARN!: Value<string>;
  constructor(properties: OriginSnapshot) {
    Object.assign(this, properties);
  }
}

export class RetentionPeriod {
  Type!: Value<string>;
  Value?: Value<number>;
  constructor(properties: RetentionPeriod) {
    Object.assign(this, properties);
  }
}

export class SnaplockConfiguration {
  AuditLogVolume?: Value<string>;
  VolumeAppendModeEnabled?: Value<string>;
  AutocommitPeriod?: AutocommitPeriod;
  RetentionPeriod?: SnaplockRetentionPeriod;
  PrivilegedDelete?: Value<string>;
  SnaplockType!: Value<string>;
  constructor(properties: SnaplockConfiguration) {
    Object.assign(this, properties);
  }
}

export class SnaplockRetentionPeriod {
  DefaultRetention!: RetentionPeriod;
  MaximumRetention!: RetentionPeriod;
  MinimumRetention!: RetentionPeriod;
  constructor(properties: SnaplockRetentionPeriod) {
    Object.assign(this, properties);
  }
}

export class TieringPolicy {
  CoolingPeriod?: Value<number>;
  Name?: Value<string>;
  constructor(properties: TieringPolicy) {
    Object.assign(this, properties);
  }
}

export class UserAndGroupQuotas {
  Type!: Value<string>;
  Id!: Value<number>;
  StorageCapacityQuotaGiB!: Value<number>;
  constructor(properties: UserAndGroupQuotas) {
    Object.assign(this, properties);
  }
}
export interface VolumeProperties {
  OpenZFSConfiguration?: OpenZFSConfiguration;
  VolumeType?: Value<string>;
  BackupId?: Value<string>;
  OntapConfiguration?: OntapConfiguration;
  Tags?: List<ResourceTag>;
  Name: Value<string>;
}
export default class Volume extends ResourceBase<VolumeProperties> {
  static AggregateConfiguration = AggregateConfiguration;
  static AutocommitPeriod = AutocommitPeriod;
  static ClientConfigurations = ClientConfigurations;
  static NfsExports = NfsExports;
  static OntapConfiguration = OntapConfiguration;
  static OpenZFSConfiguration = OpenZFSConfiguration;
  static OriginSnapshot = OriginSnapshot;
  static RetentionPeriod = RetentionPeriod;
  static SnaplockConfiguration = SnaplockConfiguration;
  static SnaplockRetentionPeriod = SnaplockRetentionPeriod;
  static TieringPolicy = TieringPolicy;
  static UserAndGroupQuotas = UserAndGroupQuotas;
  constructor(properties: VolumeProperties) {
    super('AWS::FSx::Volume', properties);
  }
}
