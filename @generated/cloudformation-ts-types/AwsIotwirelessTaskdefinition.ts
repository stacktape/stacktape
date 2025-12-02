// This file is auto-generated. Do not edit manually.
// Source: aws-iotwireless-taskdefinition.json

/** Creates a gateway task definition. */
export type AwsIotwirelessTaskdefinition = {
  /**
   * The name of the new resource.
   * @minLength 1
   * @maxLength 256
   */
  Name?: string;
  /**
   * Whether to automatically create tasks using this task definition for all gateways with the
   * specified current version. If false, the task must me created by calling CreateWirelessGatewayTask.
   */
  AutoCreateTasks: boolean;
  /** Information about the gateways to update. */
  Update?: {
    /**
     * @minLength 1
     * @maxLength 4096
     */
    UpdateDataSource?: string;
    /**
     * @minLength 1
     * @maxLength 2048
     */
    UpdateDataRole?: string;
    LoRaWAN?: {
      /**
       * @minLength 1
       * @maxLength 4096
       */
      UpdateSignature?: string;
      SigKeyCrc?: number;
      CurrentVersion?: {
        /**
         * @minLength 1
         * @maxLength 32
         */
        PackageVersion?: string;
        /**
         * @minLength 1
         * @maxLength 4096
         */
        Model?: string;
        /**
         * @minLength 1
         * @maxLength 4096
         */
        Station?: string;
      };
      UpdateVersion?: {
        /**
         * @minLength 1
         * @maxLength 32
         */
        PackageVersion?: string;
        /**
         * @minLength 1
         * @maxLength 4096
         */
        Model?: string;
        /**
         * @minLength 1
         * @maxLength 4096
         */
        Station?: string;
      };
    };
  };
  /** The list of task definitions. */
  LoRaWANUpdateGatewayTaskEntry?: {
    CurrentVersion?: {
      /**
       * @minLength 1
       * @maxLength 32
       */
      PackageVersion?: string;
      /**
       * @minLength 1
       * @maxLength 4096
       */
      Model?: string;
      /**
       * @minLength 1
       * @maxLength 4096
       */
      Station?: string;
    };
    UpdateVersion?: {
      /**
       * @minLength 1
       * @maxLength 32
       */
      PackageVersion?: string;
      /**
       * @minLength 1
       * @maxLength 4096
       */
      Model?: string;
      /**
       * @minLength 1
       * @maxLength 4096
       */
      Station?: string;
    };
  };
  /**
   * The ID of the new wireless gateway task definition
   * @pattern [a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}
   */
  Id?: string;
  /**
   * A filter to list only the wireless gateway task definitions that use this task definition type
   * @enum ["UPDATE"]
   */
  TaskDefinitionType?: "UPDATE";
  /** TaskDefinition arn. Returned after successful create. */
  Arn?: string;
  /**
   * A list of key-value pairs that contain metadata for the destination.
   * @maxItems 200
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 127
     */
    Key?: string;
    /**
     * @minLength 1
     * @maxLength 255
     */
    Value?: string;
  }[];
};
