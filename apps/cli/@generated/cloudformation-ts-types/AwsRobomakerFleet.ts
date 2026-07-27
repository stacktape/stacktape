// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-fleet.json

/**
 * AWS::RoboMaker::Fleet resource creates an AWS RoboMaker fleet. Fleets contain robots and can
 * receive deployments.
 */
export type AwsRobomakerFleet = {
  Arn?: string;
  Tags?: Record<string, string>;
  /**
   * The name of the fleet.
   * @minLength 1
   * @maxLength 255
   * @pattern [a-zA-Z0-9_\-]{1,255}$
   */
  Name?: string;
};
