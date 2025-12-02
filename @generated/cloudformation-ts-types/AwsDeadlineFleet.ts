// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-fleet.json

/** Definition of AWS::Deadline::Fleet Resource Type */
export type AwsDeadlineFleet = {
  Capabilities?: {
    /**
     * @minItems 1
     * @maxItems 15
     */
    Amounts?: {
      /**
       * @minLength 1
       * @maxLength 100
       * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?amount(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
       */
      Name: string;
      Min: number;
      Max?: number;
    }[];
    /**
     * @minItems 1
     * @maxItems 15
     */
    Attributes?: {
      /**
       * @minLength 1
       * @maxLength 100
       * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?attr(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
       */
      Name: string;
      /**
       * @minItems 1
       * @maxItems 10
       */
      Values: string[];
    }[];
  };
  Configuration: {
    CustomerManaged: {
      Mode: "NO_SCALING" | "EVENT_BASED_AUTO_SCALING";
      WorkerCapabilities: {
        VCpuCount: {
          /**
           * @minimum 1
           * @maximum 10000
           */
          Min: number;
          /**
           * @minimum 1
           * @maximum 10000
           */
          Max?: number;
        };
        MemoryMiB: {
          /**
           * @minimum 512
           * @maximum 2147483647
           */
          Min: number;
          /**
           * @minimum 512
           * @maximum 2147483647
           */
          Max?: number;
        };
        AcceleratorTypes?: "gpu"[];
        AcceleratorCount?: {
          /**
           * @minimum 0
           * @maximum 2147483647
           */
          Min: number;
          /**
           * @minimum 0
           * @maximum 2147483647
           */
          Max?: number;
        };
        AcceleratorTotalMemoryMiB?: {
          /**
           * @minimum 0
           * @maximum 2147483647
           */
          Min: number;
          /**
           * @minimum 0
           * @maximum 2147483647
           */
          Max?: number;
        };
        OsFamily: "WINDOWS" | "LINUX" | "MACOS";
        CpuArchitectureType: "x86_64" | "arm64";
        /**
         * @minItems 1
         * @maxItems 15
         */
        CustomAmounts?: {
          /**
           * @minLength 1
           * @maxLength 100
           * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?amount(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
           */
          Name: string;
          Min: number;
          Max?: number;
        }[];
        /**
         * @minItems 1
         * @maxItems 15
         */
        CustomAttributes?: {
          /**
           * @minLength 1
           * @maxLength 100
           * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?attr(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
           */
          Name: string;
          /**
           * @minItems 1
           * @maxItems 10
           */
          Values: string[];
        }[];
      };
      /** @pattern ^sp-[0-9a-f]{32}$ */
      StorageProfileId?: string;
      TagPropagationMode?: "NO_PROPAGATION" | "PROPAGATE_TAGS_TO_WORKERS_AT_LAUNCH";
    };
  } | {
    ServiceManagedEc2: {
      InstanceCapabilities: {
        VCpuCount: {
          /**
           * @minimum 1
           * @maximum 10000
           */
          Min: number;
          /**
           * @minimum 1
           * @maximum 10000
           */
          Max?: number;
        };
        MemoryMiB: {
          /**
           * @minimum 512
           * @maximum 2147483647
           */
          Min: number;
          /**
           * @minimum 512
           * @maximum 2147483647
           */
          Max?: number;
        };
        OsFamily: "LINUX" | "WINDOWS";
        CpuArchitectureType: "x86_64" | "arm64";
        RootEbsVolume?: {
          /** @default 250 */
          SizeGiB?: number;
          /**
           * @default 3000
           * @minimum 3000
           * @maximum 16000
           */
          Iops?: number;
          /**
           * @default 125
           * @minimum 125
           * @maximum 1000
           */
          ThroughputMiB?: number;
        };
        AcceleratorCapabilities?: {
          /** @minItems 1 */
          Selections: ({
            /** @enum ["t4","a10g","l4","l40s"] */
            Name: "t4" | "a10g" | "l4" | "l40s";
            /**
             * @minLength 1
             * @maxLength 100
             */
            Runtime?: string;
          })[];
          Count?: {
            /**
             * @minimum 0
             * @maximum 2147483647
             */
            Min: number;
            /**
             * @minimum 0
             * @maximum 2147483647
             */
            Max?: number;
          };
        };
        /**
         * @minItems 1
         * @maxItems 100
         */
        AllowedInstanceTypes?: string[];
        /**
         * @minItems 1
         * @maxItems 100
         */
        ExcludedInstanceTypes?: string[];
        /**
         * @minItems 1
         * @maxItems 15
         */
        CustomAmounts?: {
          /**
           * @minLength 1
           * @maxLength 100
           * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?amount(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
           */
          Name: string;
          Min: number;
          Max?: number;
        }[];
        /**
         * @minItems 1
         * @maxItems 15
         */
        CustomAttributes?: {
          /**
           * @minLength 1
           * @maxLength 100
           * @pattern ^([a-zA-Z][a-zA-Z0-9]{0,63}:)?attr(\.[a-zA-Z][a-zA-Z0-9]{0,63})+$
           */
          Name: string;
          /**
           * @minItems 1
           * @maxItems 10
           */
          Values: string[];
        }[];
      };
      InstanceMarketOptions: {
        Type: "on-demand" | "spot" | "wait-and-save";
      };
      VpcConfiguration?: {
        ResourceConfigurationArns?: string[];
      };
      /** @pattern ^sp-[0-9a-f]{32}$ */
      StorageProfileId?: string;
    };
  };
  /**
   * @default ""
   * @minLength 0
   * @maxLength 100
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   */
  DisplayName: string;
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  /** @pattern ^fleet-[0-9a-f]{32}$ */
  FleetId?: string;
  HostConfiguration?: {
    /**
     * @minLength 0
     * @maxLength 15000
     */
    ScriptBody: string;
    /**
     * @default 300
     * @minimum 300
     * @maximum 3600
     */
    ScriptTimeoutSeconds?: number;
  };
  /**
   * @minimum 0
   * @maximum 2147483647
   */
  MaxWorkerCount: number;
  /**
   * @default 0
   * @minimum 0
   * @maximum 2147483647
   */
  MinWorkerCount?: number;
  /** @pattern ^arn:(aws[a-zA-Z-]*):iam::\d{12}:role(/[!-.0-~]+)*/[\w+=,.@-]+$ */
  RoleArn: string;
  Status?: "ACTIVE" | "CREATE_IN_PROGRESS" | "UPDATE_IN_PROGRESS" | "CREATE_FAILED" | "UPDATE_FAILED" | "SUSPENDED";
  StatusMessage?: string;
  WorkerCount?: number;
  /** @pattern ^arn:(aws[a-zA-Z-]*):deadline:[a-z0-9-]+:[0-9]+:farm/farm-[0-9a-z]{32}/fleet/fleet-[0-9a-z]{32} */
  Arn?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 127 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 127
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 1 to 255 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 255
     */
    Value: string;
  }[];
};
