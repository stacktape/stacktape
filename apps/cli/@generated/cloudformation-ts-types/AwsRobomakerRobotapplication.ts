// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-robotapplication.json

/** This schema is for testing purpose only. */
export type AwsRobomakerRobotapplication = {
  /**
   * The name of the robot application.
   * @minLength 1
   * @maxLength 255
   */
  Name?: string;
  /** The sources of the robot application. */
  Sources?: ({
    /** The Arn of the S3Bucket that stores the robot application source. */
    S3Bucket: string;
    /** The s3 key of robot application source. */
    S3Key: string;
    /**
     * The architecture of robot application.
     * @minLength 1
     * @maxLength 255
     * @enum ["X86_64","ARM64","ARMHF"]
     */
    Architecture: "X86_64" | "ARM64" | "ARMHF";
  })[];
  /** The URI of the Docker image for the robot application. */
  Environment?: string;
  RobotSoftwareSuite: {
    /**
     * The name of robot software suite.
     * @enum ["ROS","ROS2","General"]
     */
    Name: "ROS" | "ROS2" | "General";
    /**
     * The version of robot software suite.
     * @enum ["Kinetic","Melodic","Dashing"]
     */
    Version?: "Kinetic" | "Melodic" | "Dashing";
  };
  /**
   * The revision ID of robot application.
   * @minLength 1
   * @maxLength 40
   */
  CurrentRevisionId?: string;
  Arn?: string;
  Tags?: Record<string, string>;
};
