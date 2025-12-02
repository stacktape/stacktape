import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class MaintenanceWindow {
  DaysOfWeek?: List<Value<string>>;
  Preference?: Value<string>;
  LeadTimeInWeeks?: Value<number>;
  Months?: List<Value<string>>;
  WeeksOfMonth?: List<Value<number>>;
  HoursOfDay?: List<Value<number>>;
  constructor(properties: MaintenanceWindow) {
    Object.assign(this, properties);
  }
}
export interface CloudAutonomousVmClusterProperties {
  CloudExadataInfrastructureId?: Value<string>;
  LicenseModel?: Value<string>;
  Description?: Value<string>;
  CpuCoreCountPerNode?: Value<number>;
  MemoryPerOracleComputeUnitInGBs?: Value<number>;
  DbServers?: List<Value<string>>;
  TotalContainerDatabases?: Value<number>;
  TimeZone?: Value<string>;
  AutonomousDataStorageSizeInTBs?: Value<number>;
  ScanListenerPortNonTls?: Value<number>;
  OdbNetworkId?: Value<string>;
  IsMtlsEnabledVmCluster?: Value<boolean>;
  DisplayName?: Value<string>;
  ScanListenerPortTls?: Value<number>;
  MaintenanceWindow?: MaintenanceWindow;
  Tags?: List<ResourceTag>;
}
export default class CloudAutonomousVmCluster extends ResourceBase<CloudAutonomousVmClusterProperties> {
  static MaintenanceWindow = MaintenanceWindow;
  constructor(properties?: CloudAutonomousVmClusterProperties) {
    super('AWS::ODB::CloudAutonomousVmCluster', properties || {});
  }
}
