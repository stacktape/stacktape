// This file is auto-generated. Do not edit manually.
// Source: aws-robomaker-simulationapplication.json

/** This schema is for testing purpose only. */
export type AwsRobomakerSimulationapplication = {
  Arn?: string;
  /**
   * The name of the simulation application.
   * @minLength 1
   * @maxLength 255
   * @pattern [a-zA-Z0-9_\-]*
   */
  Name?: string;
  /** The current revision id. */
  CurrentRevisionId?: string;
  /** The rendering engine for the simulation application. */
  RenderingEngine?: {
    /**
     * The name of the rendering engine.
     * @enum ["OGRE"]
     */
    Name: "OGRE";
    /**
     * The version of the rendering engine.
     * @pattern 1.x
     */
    Version: string;
  };
  /** The robot software suite used by the simulation application. */
  RobotSoftwareSuite: {
    /**
     * The name of the robot software suite.
     * @enum ["ROS","ROS2","General"]
     */
    Name: "ROS" | "ROS2" | "General";
    /**
     * The version of the robot software suite.
     * @enum ["Kinetic","Melodic","Dashing","Foxy"]
     */
    Version?: "Kinetic" | "Melodic" | "Dashing" | "Foxy";
  };
  /** The simulation software suite used by the simulation application. */
  SimulationSoftwareSuite: {
    /**
     * The name of the simulation software suite.
     * @enum ["Gazebo","RosbagPlay","SimulationRuntime"]
     */
    Name: "Gazebo" | "RosbagPlay" | "SimulationRuntime";
    /**
     * The version of the simulation software suite.
     * @enum ["7","9","11","Kinetic","Melodic","Dashing","Foxy"]
     */
    Version?: "7" | "9" | "11" | "Kinetic" | "Melodic" | "Dashing" | "Foxy";
  };
  /** The sources of the simulation application. */
  Sources?: ({
    /**
     * The Amazon S3 bucket name.
     * @pattern [a-z0-9][a-z0-9.\-]*[a-z0-9]
     */
    S3Bucket: string;
    /**
     * The s3 object key.
     * @minLength 1
     * @maxLength 1024
     */
    S3Key: string;
    /**
     * The target processor architecture for the application.
     * @enum ["X86_64","ARM64","ARMHF"]
     */
    Architecture: "X86_64" | "ARM64" | "ARMHF";
  })[];
  /** The URI of the Docker image for the robot application. */
  Environment?: string;
  Tags?: Record<string, string>;
};
