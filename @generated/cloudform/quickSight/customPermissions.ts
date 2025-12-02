import { ResourceBase, ResourceTag } from '../resource';
import { Value, List } from '../dataTypes';
export class Capabilities {
  IncludeContentInScheduledReportsEmail?: Value<string>;
  ExportToCsvInScheduledReports?: Value<string>;
  CreateAndUpdateDataSources?: Value<string>;
  ViewAccountSPICECapacity?: Value<string>;
  Dashboard?: Value<string>;
  ExportToPdfInScheduledReports?: Value<string>;
  CreateSPICEDataset?: Value<string>;
  CreateAndUpdateDatasets?: Value<string>;
  PrintReports?: Value<string>;
  ShareDatasets?: Value<string>;
  ExportToExcelInScheduledReports?: Value<string>;
  CreateAndUpdateDashboardEmailReports?: Value<string>;
  CreateAndUpdateThresholdAlerts?: Value<string>;
  CreateSharedFolders?: Value<string>;
  ShareDashboards?: Value<string>;
  RenameSharedFolders?: Value<string>;
  AddOrRunAnomalyDetectionForAnalyses?: Value<string>;
  ShareDataSources?: Value<string>;
  ExportToExcel?: Value<string>;
  ExportToPdf?: Value<string>;
  ShareAnalyses?: Value<string>;
  SubscribeDashboardEmailReports?: Value<string>;
  Analysis?: Value<string>;
  ExportToCsv?: Value<string>;
  CreateAndUpdateThemes?: Value<string>;
  constructor(properties: Capabilities) {
    Object.assign(this, properties);
  }
}
export interface CustomPermissionsProperties {
  CustomPermissionsName: Value<string>;
  Capabilities?: Capabilities;
  AwsAccountId: Value<string>;
  Tags?: List<ResourceTag>;
}
export default class CustomPermissions extends ResourceBase<CustomPermissionsProperties> {
  static Capabilities = Capabilities;
  constructor(properties: CustomPermissionsProperties) {
    super('AWS::QuickSight::CustomPermissions', properties);
  }
}
