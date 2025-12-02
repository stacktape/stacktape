// This file is auto-generated. Do not edit manually.
// Source: aws-ssm-maintenancewindowtarget.json

/** Resource Type definition for AWS::SSM::MaintenanceWindowTarget */
export type AwsSsmMaintenancewindowtarget = {
  OwnerInformation?: string;
  Description?: string;
  WindowId: string;
  ResourceType: string;
  /** @uniqueItems false */
  Targets: {
    /** @uniqueItems false */
    Values: string[];
    Key: string;
  }[];
  Id?: string;
  Name?: string;
};
