// This file is auto-generated. Do not edit manually.
// Source: aws-gamelift-containergroupdefinition.json

/**
 * The AWS::GameLift::ContainerGroupDefinition resource creates an Amazon GameLift container group
 * definition.
 */
export type AwsGameliftContainergroupdefinition = {
  /**
   * The Amazon Resource Name (ARN) that is assigned to a Amazon GameLift container group resource and
   * uniquely identifies it across all AWS Regions.
   * @minLength 1
   * @maxLength 512
   * @pattern ^arn:.*:containergroupdefinition\/[a-zA-Z0-9\-]+(:[0-9]+)?$
   */
  ContainerGroupDefinitionArn?: string;
  /**
   * A time stamp indicating when this data object was created. Format is a number expressed in Unix
   * time as milliseconds (for example "1469498468.057").
   */
  CreationTime?: string;
  /**
   * The operating system of the container group
   * @enum ["AMAZON_LINUX_2023"]
   */
  OperatingSystem: "AMAZON_LINUX_2023";
  /**
   * A descriptive label for the container group definition.
   * @minLength 1
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-]+$
   */
  Name: string;
  /**
   * The scope of the container group
   * @enum ["GAME_SERVER","PER_INSTANCE"]
   */
  ContainerGroupType?: "GAME_SERVER" | "PER_INSTANCE";
  /**
   * The total memory limit of container groups following this definition in MiB
   * @minimum 4
   * @maximum 1024000
   */
  TotalMemoryLimitMebibytes: number;
  /**
   * The total amount of virtual CPUs on the container group definition
   * @minimum 0.125
   * @maximum 10
   */
  TotalVcpuLimit: number;
  GameServerContainerDefinition?: {
    /**
     * A descriptive label for the container definition. Container definition names must be unique with a
     * container group definition.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9-]+$
     */
    ContainerName: string;
    /**
     * A list of container dependencies that determines when this container starts up and shuts down. For
     * container groups with multiple containers, dependencies let you define a startup/shutdown sequence
     * across the containers.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    DependsOn?: ({
      /**
       * A descriptive label for the container definition. The container being defined depends on this
       * container's condition.
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      ContainerName: string;
      /**
       * The type of dependency.
       * @enum ["START","COMPLETE","SUCCESS","HEALTHY"]
       */
      Condition: "START" | "COMPLETE" | "SUCCESS" | "HEALTHY";
    })[];
    /**
     * The version of the server SDK used in this container group
     * @maxLength 128
     * @pattern ^\d+\.\d+\.\d+$
     */
    ServerSdkVersion: string;
    /**
     * Specifies the image URI of this container.
     * @minLength 1
     * @maxLength 255
     * @pattern ^[a-zA-Z0-9-_\.@\/:]+$
     */
    ImageUri: string;
    /**
     * The digest of the container image.
     * @pattern ^sha256:[a-fA-F0-9]{64}$
     */
    ResolvedImageDigest?: string;
    /**
     * The environment variables to pass to a container.
     * @minItems 1
     * @maxItems 20
     * @uniqueItems true
     */
    EnvironmentOverride?: {
      /**
       * The environment variable name.
       * @minLength 1
       * @maxLength 255
       * @pattern ^.*$
       */
      Name: string;
      /**
       * The environment variable value.
       * @minLength 1
       * @maxLength 255
       * @pattern ^.*$
       */
      Value: string;
    }[];
    /** Defines the ports on the container. */
    PortConfiguration?: {
      /**
       * Specifies one or more ranges of ports on a container.
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      ContainerPortRanges: ({
        /**
         * A starting value for the range of allowed port numbers.
         * @minimum 1
         * @maximum 60000
         */
        FromPort: number;
        /**
         * Defines the protocol of these ports.
         * @enum ["TCP","UDP"]
         */
        Protocol: "TCP" | "UDP";
        /**
         * An ending value for the range of allowed port numbers. Port numbers are end-inclusive. This value
         * must be equal to or greater than FromPort.
         * @minimum 1
         * @maximum 60000
         */
        ToPort: number;
      })[];
    };
    /**
     * A list of mount point configurations to be used in a container.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    MountPoints?: ({
      /**
       * The path on the host that will be mounted in the container.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^\/[\s\S]*$
       */
      InstancePath: string;
      /**
       * The path inside the container where the mount is accessible.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^(\/+[^\/]+\/*)+$
       */
      ContainerPath?: string;
      /**
       * The access permissions for the mounted path.
       * @enum ["READ_ONLY","READ_AND_WRITE"]
       */
      AccessLevel?: "READ_ONLY" | "READ_AND_WRITE";
    })[];
  };
  /**
   * A collection of support container definitions that define the containers in this group.
   * @minItems 1
   * @maxItems 10
   * @uniqueItems true
   */
  SupportContainerDefinitions?: ({
    /**
     * A descriptive label for the container definition.
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9-]+$
     */
    ContainerName: string;
    /**
     * The number of virtual CPUs to give to the support group
     * @minimum 0.125
     * @maximum 10
     */
    Vcpu?: number;
    /**
     * A list of container dependencies that determines when this container starts up and shuts down. For
     * container groups with multiple containers, dependencies let you define a startup/shutdown sequence
     * across the containers.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    DependsOn?: ({
      /**
       * A descriptive label for the container definition. The container being defined depends on this
       * container's condition.
       * @minLength 1
       * @maxLength 128
       * @pattern ^[a-zA-Z0-9-]+$
       */
      ContainerName: string;
      /**
       * The type of dependency.
       * @enum ["START","COMPLETE","SUCCESS","HEALTHY"]
       */
      Condition: "START" | "COMPLETE" | "SUCCESS" | "HEALTHY";
    })[];
    /**
     * Specifies if the container is essential. If an essential container fails a health check, then all
     * containers in the container group will be restarted. You must specify exactly 1 essential container
     * in a container group.
     */
    Essential?: boolean;
    /**
     * Specifies the image URI of this container.
     * @minLength 1
     * @maxLength 255
     * @pattern ^[a-zA-Z0-9-_\.@\/:]+$
     */
    ImageUri: string;
    /**
     * The digest of the container image.
     * @pattern ^sha256:[a-fA-F0-9]{64}$
     */
    ResolvedImageDigest?: string;
    /**
     * The total memory limit of container groups following this definition in MiB
     * @minimum 4
     * @maximum 1024000
     */
    MemoryHardLimitMebibytes?: number;
    /**
     * The environment variables to pass to a container.
     * @minItems 1
     * @maxItems 20
     * @uniqueItems true
     */
    EnvironmentOverride?: {
      /**
       * The environment variable name.
       * @minLength 1
       * @maxLength 255
       * @pattern ^.*$
       */
      Name: string;
      /**
       * The environment variable value.
       * @minLength 1
       * @maxLength 255
       * @pattern ^.*$
       */
      Value: string;
    }[];
    /** Defines the ports on the container. */
    PortConfiguration?: {
      /**
       * Specifies one or more ranges of ports on a container.
       * @minItems 1
       * @maxItems 100
       * @uniqueItems true
       */
      ContainerPortRanges: ({
        /**
         * A starting value for the range of allowed port numbers.
         * @minimum 1
         * @maximum 60000
         */
        FromPort: number;
        /**
         * Defines the protocol of these ports.
         * @enum ["TCP","UDP"]
         */
        Protocol: "TCP" | "UDP";
        /**
         * An ending value for the range of allowed port numbers. Port numbers are end-inclusive. This value
         * must be equal to or greater than FromPort.
         * @minimum 1
         * @maximum 60000
         */
        ToPort: number;
      })[];
    };
    /** Specifies how the health of the containers will be checked. */
    HealthCheck?: {
      /**
       * A string array representing the command that the container runs to determine if it is healthy.
       * @minItems 1
       * @maxItems 20
       * @uniqueItems false
       */
      Command: string[];
      /**
       * How often (in seconds) the health is checked.
       * @minimum 60
       * @maximum 300
       */
      Interval?: number;
      /**
       * How many seconds the process manager allows the command to run before canceling it.
       * @minimum 30
       * @maximum 60
       */
      Timeout?: number;
      /**
       * How many times the process manager will retry the command after a timeout. (The first run of the
       * command does not count as a retry.)
       * @minimum 5
       * @maximum 10
       */
      Retries?: number;
      /**
       * The optional grace period (in seconds) to give a container time to boostrap before teh health check
       * is declared failed.
       * @minimum 0
       * @maximum 300
       */
      StartPeriod?: number;
    };
    /**
     * A list of mount point configurations to be used in a container.
     * @minItems 1
     * @maxItems 10
     * @uniqueItems true
     */
    MountPoints?: ({
      /**
       * The path on the host that will be mounted in the container.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^\/[\s\S]*$
       */
      InstancePath: string;
      /**
       * The path inside the container where the mount is accessible.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^(\/+[^\/]+\/*)+$
       */
      ContainerPath?: string;
      /**
       * The access permissions for the mounted path.
       * @enum ["READ_ONLY","READ_AND_WRITE"]
       */
      AccessLevel?: "READ_ONLY" | "READ_AND_WRITE";
    })[];
  })[];
  /**
   * The version of this ContainerGroupDefinition
   * @minimum 0
   */
  VersionNumber?: number;
  /**
   * A specific ContainerGroupDefinition version to be updated
   * @minimum 0
   */
  SourceVersionNumber?: number;
  /**
   * The description of this version
   * @minLength 1
   * @maxLength 1024
   */
  VersionDescription?: string;
  /**
   * A string indicating ContainerGroupDefinition status.
   * @enum ["READY","COPYING","FAILED"]
   */
  Status?: "READY" | "COPYING" | "FAILED";
  /** A string indicating the reason for ContainerGroupDefinition status. */
  StatusReason?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @minItems 0
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length.
     * @minLength 1
     * @maxLength 128
     * @pattern ^.*$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length.
     * @minLength 0
     * @maxLength 256
     * @pattern ^.*$
     */
    Value: string;
  }[];
};
