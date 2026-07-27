// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-robot.json

/** AWS::RoboMaker::Robot resource creates an AWS RoboMaker Robot. */
export type AwsRobomakerRobot = {
  Arn?: string;
  /**
   * The Amazon Resource Name (ARN) of the fleet.
   * @minLength 1
   * @maxLength 1224
   */
  Fleet?: string;
  /**
   * The target architecture of the robot.
   * @enum ["X86_64","ARM64","ARMHF"]
   */
  Architecture: "X86_64" | "ARM64" | "ARMHF";
  /**
   * The Greengrass group id.
   * @minLength 1
   * @maxLength 1224
   */
  GreengrassGroupId: string;
  Tags?: Record<string, string>;
  /**
   * The name for the robot.
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
};
