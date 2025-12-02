import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class DataCollectionOptions {
  IsIncidentLogsEnabled?: Value<boolean>;
  IsDiagnosticsEventsEnabled?: Value<boolean>;
  IsHealthMonitoringEnabled?: Value<boolean>;
  constructor(properties: DataCollectionOptions) {
    Object.assign(this, properties);
  }
}

export class DbNode {
  Status?: Value<string>;
  HostIpId?: Value<string>;
  MemorySizeInGBs?: Value<number>;
  CpuCoreCount?: Value<number>;
  BackupIpId?: Value<string>;
  Hostname?: Value<string>;
  Ocid?: Value<string>;
  DbNodeId?: Value<string>;
  VnicId?: Value<string>;
  DbNodeStorageSizeInGBs?: Value<number>;
  Vnic2Id?: Value<string>;
  DbNodeArn?: Value<string>;
  DbServerId!: Value<string>;
  BackupVnic2Id?: Value<string>;
  Tags?: List<ResourceTag>;
  DbSystemId?: Value<string>;
  constructor(properties: DbNode) {
    Object.assign(this, properties);
  }
}
export interface CloudVmClusterProperties {
  CloudExadataInfrastructureId?: Value<string>;
  DataCollectionOptions?: DataCollectionOptions;
  LicenseModel?: Value<string>;
  MemorySizeInGBs?: Value<number>;
  CpuCoreCount?: Value<number>;
  SshPublicKeys?: List<Value<string>>;
  Hostname?: Value<string>;
  SystemVersion?: Value<string>;
  DataStorageSizeInTBs?: Value<number>;
  IsLocalBackupEnabled?: Value<boolean>;
  DbServers?: List<Value<string>>;
  DbNodes?: List<DbNode>;
  TimeZone?: Value<string>;
  IsSparseDiskgroupEnabled?: Value<boolean>;
  GiVersion?: Value<string>;
  OdbNetworkId?: Value<string>;
  DbNodeStorageSizeInGBs?: Value<number>;
  DisplayName?: Value<string>;
  ClusterName?: Value<string>;
  Tags?: List<ResourceTag>;
  ScanListenerPortTcp?: Value<number>;
}
export default class CloudVmCluster extends ResourceBase<CloudVmClusterProperties> {
  static DataCollectionOptions = DataCollectionOptions;
  static DbNode = DbNode;
  constructor(properties?: CloudVmClusterProperties) {
    super('AWS::ODB::CloudVmCluster', properties || {});
  }
}
