// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-simulationapplicationversion.json

/**
 * AWS::RoboMaker::SimulationApplicationVersion resource creates an AWS RoboMaker
 * SimulationApplicationVersion. This helps you control which code your simulation uses.
 */
export type AwsRobomakerSimulationapplicationversion = {
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
