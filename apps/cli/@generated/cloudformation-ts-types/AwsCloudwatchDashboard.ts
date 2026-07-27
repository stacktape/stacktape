// This file is auto-generated. Do not edit manually.
// Source: aws-cloudwatch-dashboard.json

/** Resource Type definition for AWS::CloudWatch::Dashboard */
export type AwsCloudwatchDashboard = {
  /**
   * The name of the dashboard. The name must be between 1 and 255 characters. If you do not specify a
   * name, one will be generated automatically.
   */
  DashboardName?: string;
  /**
   * The detailed information about the dashboard in JSON format, including the widgets to include and
   * their location on the dashboard
   */
  DashboardBody: string;
};
