// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-maintenancewindow.json

/** Resource Type definition for AWS::SSM::MaintenanceWindow */
export type AwsSsmMaintenancewindow = {
  StartDate?: string;
  Description?: string;
  AllowUnassociatedTargets: boolean;
  Cutoff: number;
  Schedule: string;
  Duration: number;
  ScheduleOffset?: number;
  Id?: string;
  EndDate?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name: string;
  ScheduleTimezone?: string;
};
