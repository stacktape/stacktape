// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-signalcatalog.json

/** Definition of AWS::IoTFleetWise::SignalCatalog Resource Type */
export type AwsIotfleetwiseSignalcatalog = {
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[^\u0000-\u001F\u007F]+$
   */
  Description?: string;
  LastModificationTime?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z\d\-_:]+$
   */
  Name?: string;
  NodeCounts?: {
    TotalNodes?: number;
    TotalBranches?: number;
    TotalSensors?: number;
    TotalAttributes?: number;
    TotalActuators?: number;
  };
  /**
   * @minItems 1
   * @maxItems 5000
   * @uniqueItems true
   */
  Nodes?: ({
    Branch?: {
      FullyQualifiedName: string;
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[^\u0000-\u001F\u007F]+$
       */
      Description?: string;
    };
  } | {
    Sensor?: {
      FullyQualifiedName: string;
      DataType: "INT8" | "UINT8" | "INT16" | "UINT16" | "INT32" | "UINT32" | "INT64" | "UINT64" | "BOOLEAN" | "FLOAT" | "DOUBLE" | "STRING" | "UNIX_TIMESTAMP" | "INT8_ARRAY" | "UINT8_ARRAY" | "INT16_ARRAY" | "UINT16_ARRAY" | "INT32_ARRAY" | "UINT32_ARRAY" | "INT64_ARRAY" | "UINT64_ARRAY" | "BOOLEAN_ARRAY" | "FLOAT_ARRAY" | "DOUBLE_ARRAY" | "STRING_ARRAY" | "UNIX_TIMESTAMP_ARRAY" | "UNKNOWN";
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[^\u0000-\u001F\u007F]+$
       */
      Description?: string;
      Unit?: string;
      AllowedValues?: string[];
      Min?: number;
      Max?: number;
    };
  } | {
    Actuator?: {
      FullyQualifiedName: string;
      DataType: "INT8" | "UINT8" | "INT16" | "UINT16" | "INT32" | "UINT32" | "INT64" | "UINT64" | "BOOLEAN" | "FLOAT" | "DOUBLE" | "STRING" | "UNIX_TIMESTAMP" | "INT8_ARRAY" | "UINT8_ARRAY" | "INT16_ARRAY" | "UINT16_ARRAY" | "INT32_ARRAY" | "UINT32_ARRAY" | "INT64_ARRAY" | "UINT64_ARRAY" | "BOOLEAN_ARRAY" | "FLOAT_ARRAY" | "DOUBLE_ARRAY" | "STRING_ARRAY" | "UNIX_TIMESTAMP_ARRAY" | "UNKNOWN";
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[^\u0000-\u001F\u007F]+$
       */
      Description?: string;
      Unit?: string;
      AllowedValues?: string[];
      Min?: number;
      Max?: number;
      AssignedValue?: string;
    };
  } | {
    Attribute?: {
      FullyQualifiedName: string;
      DataType: "INT8" | "UINT8" | "INT16" | "UINT16" | "INT32" | "UINT32" | "INT64" | "UINT64" | "BOOLEAN" | "FLOAT" | "DOUBLE" | "STRING" | "UNIX_TIMESTAMP" | "INT8_ARRAY" | "UINT8_ARRAY" | "INT16_ARRAY" | "UINT16_ARRAY" | "INT32_ARRAY" | "UINT32_ARRAY" | "INT64_ARRAY" | "UINT64_ARRAY" | "BOOLEAN_ARRAY" | "FLOAT_ARRAY" | "DOUBLE_ARRAY" | "STRING_ARRAY" | "UNIX_TIMESTAMP_ARRAY" | "UNKNOWN";
      /**
       * @minLength 1
       * @maxLength 2048
       * @pattern ^[^\u0000-\u001F\u007F]+$
       */
      Description?: string;
      Unit?: string;
      AllowedValues?: string[];
      Min?: number;
      Max?: number;
      AssignedValue?: string;
      DefaultValue?: string;
    };
  })[];
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
