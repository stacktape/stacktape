// This file is auto-generated. Do not edit manually.
// Source: aws-panorama-applicationinstance.json

/** Creates an application instance and deploys it to a device. */
export type AwsPanoramaApplicationinstance = {
  DefaultRuntimeContextDeviceName?: string;
  Status?: "DEPLOYMENT_PENDING" | "DEPLOYMENT_REQUESTED" | "DEPLOYMENT_IN_PROGRESS" | "DEPLOYMENT_ERROR" | "DEPLOYMENT_SUCCEEDED" | "REMOVAL_PENDING" | "REMOVAL_REQUESTED" | "REMOVAL_IN_PROGRESS" | "REMOVAL_FAILED" | "REMOVAL_SUCCEEDED";
  /** The device's ID. */
  DefaultRuntimeContextDevice: string;
  /** A description for the application instance. */
  Description?: string;
  /** The ID of an application instance to replace with the new instance. */
  ApplicationInstanceIdToReplace?: string;
  CreatedTime?: number;
  HealthStatus?: "RUNNING" | "ERROR" | "NOT_AVAILABLE";
  /** Setting overrides for the application manifest. */
  ManifestOverridesPayload?: {
    /** The overrides document. */
    PayloadData?: string;
  };
  LastUpdatedTime?: number;
  /** The ARN of a runtime role for the application instance. */
  RuntimeRoleArn?: string;
  /** A name for the application instance. */
  Name?: string;
  ApplicationInstanceId?: string;
  StatusDescription?: string;
  /** The application's manifest document. */
  ManifestPayload: {
    /** The application manifest. */
    PayloadData?: string;
  };
  Arn?: string;
  /** Tags for the application instance. */
  Tags?: {
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^.+$
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^.+$
     */
    Key: string;
  }[];
};
