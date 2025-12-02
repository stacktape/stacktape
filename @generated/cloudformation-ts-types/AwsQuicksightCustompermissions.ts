// This file is auto-generated. Do not edit manually.
// Source: aws-quicksight-custompermissions.json

/** Definition of the AWS::QuickSight::CustomPermissions Resource Type. */
export type AwsQuicksightCustompermissions = {
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[a-zA-Z0-9+=,.@_-]+$
   */
  CustomPermissionsName: string;
  Capabilities?: {
    IncludeContentInScheduledReportsEmail?: "DENY";
    ExportToCsvInScheduledReports?: "DENY";
    CreateAndUpdateDataSources?: "DENY";
    ViewAccountSPICECapacity?: "DENY";
    Dashboard?: "DENY";
    ExportToPdfInScheduledReports?: "DENY";
    CreateSPICEDataset?: "DENY";
    CreateAndUpdateDatasets?: "DENY";
    PrintReports?: "DENY";
    ShareDatasets?: "DENY";
    ExportToExcelInScheduledReports?: "DENY";
    CreateAndUpdateDashboardEmailReports?: "DENY";
    CreateAndUpdateThresholdAlerts?: "DENY";
    CreateSharedFolders?: "DENY";
    ShareDashboards?: "DENY";
    RenameSharedFolders?: "DENY";
    AddOrRunAnomalyDetectionForAnalyses?: "DENY";
    ShareDataSources?: "DENY";
    ExportToExcel?: "DENY";
    ExportToPdf?: "DENY";
    ShareAnalyses?: "DENY";
    SubscribeDashboardEmailReports?: "DENY";
    Analysis?: "DENY";
    ExportToCsv?: "DENY";
    CreateAndUpdateThemes?: "DENY";
  };
  /**
   * @minLength 12
   * @maxLength 12
   * @pattern ^[0-9]{12}$
   */
  AwsAccountId: string;
  Arn?: string;
  /**
   * @minItems 1
   * @maxItems 200
   */
  Tags?: {
    /**
     * <p>Tag value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
    /**
     * <p>Tag key.</p>
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
