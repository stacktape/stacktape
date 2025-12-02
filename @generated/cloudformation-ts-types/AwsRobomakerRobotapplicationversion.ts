// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-robotapplicationversion.json

/**
 * AWS::RoboMaker::RobotApplicationVersion resource creates an AWS RoboMaker RobotApplicationVersion.
 * This helps you control which code your robot uses.
 */
export type AwsRobomakerRobotapplicationversion = {
  Application: string;
  /**
   * The revision ID of robot application.
   * @minLength 1
   * @maxLength 40
   * @pattern [a-zA-Z0-9_.\-]*
   */
  CurrentRevisionId?: string;
  ApplicationVersion?: string;
  Arn?: string;
};
