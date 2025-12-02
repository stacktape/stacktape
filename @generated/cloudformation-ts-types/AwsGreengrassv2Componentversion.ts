// This file is auto-generated. Do not edit manually.
// Source: aws-greengrassv2-componentversion.json

/** Resource for Greengrass component version. */
export type AwsGreengrassv2Componentversion = {
  Arn?: string;
  ComponentName?: string;
  ComponentVersion?: string;
  InlineRecipe?: string;
  LambdaFunction?: {
    /** @pattern ^arn:[^:]*:lambda:(([a-z]+-)+[0-9])?:([0-9]{12})?:[^.]+$ */
    LambdaArn?: string;
    ComponentName?: string;
    ComponentVersion?: string;
    ComponentPlatforms?: {
      Name?: string;
      Attributes?: Record<string, string>;
    }[];
    ComponentDependencies?: Record<string, {
      VersionRequirement?: string;
      /** @enum ["SOFT","HARD"] */
      DependencyType?: "SOFT" | "HARD";
    }>;
    ComponentLambdaParameters?: {
      EventSources?: ({
        Topic?: string;
        /** @enum ["PUB_SUB","IOT_CORE"] */
        Type?: "PUB_SUB" | "IOT_CORE";
      })[];
      MaxQueueSize?: number;
      MaxInstancesCount?: number;
      MaxIdleTimeInSeconds?: number;
      TimeoutInSeconds?: number;
      StatusTimeoutInSeconds?: number;
      Pinned?: boolean;
      /** @enum ["json","binary"] */
      InputPayloadEncodingType?: "json" | "binary";
      ExecArgs?: string[];
      EnvironmentVariables?: Record<string, string>;
      LinuxProcessParams?: {
        /** @enum ["GreengrassContainer","NoContainer"] */
        IsolationMode?: "GreengrassContainer" | "NoContainer";
        ContainerParams?: {
          MemorySizeInKB?: number;
          MountROSysfs?: boolean;
          Volumes?: ({
            SourcePath?: string;
            DestinationPath?: string;
            Permission?: "ro" | "rw";
            AddGroupOwner?: boolean;
          })[];
          Devices?: ({
            Path?: string;
            Permission?: "ro" | "rw";
            AddGroupOwner?: boolean;
          })[];
        };
      };
    };
  };
  Tags?: Record<string, string>;
};
