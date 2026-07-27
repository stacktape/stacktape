// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-endpoint.json

/** Resource Type definition for AWS::SageMaker::Endpoint */
export type AwsSagemakerEndpoint = {
  /**
   * Specifies deployment configuration for updating the SageMaker endpoint. Includes rollback and
   * update policies.
   */
  DeploymentConfig?: {
    /** Configuration for automatic rollback if an error occurs during deployment. */
    AutoRollbackConfiguration?: {
      /**
       * List of CloudWatch alarms to monitor during the deployment. If any alarm goes off, the deployment
       * is rolled back.
       * @uniqueItems true
       */
      Alarms: {
        /** The name of the CloudWatch alarm. */
        AlarmName: string;
      }[];
    };
    /** Configuration for blue-green update deployment policies. */
    BlueGreenUpdatePolicy?: {
      /** The maximum time allowed for the blue/green update, in seconds. */
      MaximumExecutionTimeoutInSeconds?: number;
      /** The wait time before terminating the old endpoint during a blue/green deployment. */
      TerminationWaitInSeconds?: number;
      /** The traffic routing configuration for the blue/green deployment. */
      TrafficRoutingConfiguration: {
        /** Specifies the size of the canary traffic in a canary deployment. */
        CanarySize?: {
          /** Specifies whether the `Value` is an instance count or a capacity unit. */
          Type: string;
          /** The value representing either the number of instances or the number of capacity units. */
          Value: number;
        };
        /** Specifies the step size for linear traffic routing. */
        LinearStepSize?: {
          /** Specifies whether the `Value` is an instance count or a capacity unit. */
          Type: string;
          /** The value representing either the number of instances or the number of capacity units. */
          Value: number;
        };
        /** Specifies the type of traffic routing (e.g., 'AllAtOnce', 'Canary', 'Linear'). */
        Type: string;
        /** Specifies the wait interval between traffic shifts, in seconds. */
        WaitIntervalInSeconds?: number;
      };
    };
    /** Configuration for rolling update deployment policies. */
    RollingUpdatePolicy?: {
      /** Specifies the maximum batch size for each rolling update. */
      MaximumBatchSize: {
        /** Specifies whether the `Value` is an instance count or a capacity unit. */
        Type: string;
        /** The value representing either the number of instances or the number of capacity units. */
        Value: number;
      };
      /** The maximum time allowed for the rolling update, in seconds. */
      MaximumExecutionTimeoutInSeconds?: number;
      /** The maximum batch size for rollback during an update failure. */
      RollbackMaximumBatchSize?: {
        /** Specifies whether the `Value` is an instance count or a capacity unit. */
        Type: string;
        /** The value representing either the number of instances or the number of capacity units. */
        Value: number;
      };
      /** The time to wait between steps during the rolling update, in seconds. */
      WaitIntervalInSeconds: number;
    };
  };
  /** The Amazon Resource Name (ARN) of the endpoint. */
  EndpointArn?: string;
  /** The name of the endpoint configuration for the SageMaker endpoint. This is a required property. */
  EndpointConfigName: string;
  /** The name of the SageMaker endpoint. This name must be unique within an AWS Region. */
  EndpointName?: string;
  /**
   * Specifies a list of variant properties that you want to exclude when updating an endpoint.
   * @uniqueItems false
   */
  ExcludeRetainedVariantProperties?: {
    /** The type of variant property (e.g., 'DesiredInstanceCount', 'DesiredWeight', 'DataCaptureConfig'). */
    VariantPropertyType?: string;
  }[];
  /** When set to true, retains all variant properties for an endpoint when it is updated. */
  RetainAllVariantProperties?: boolean;
  /** When set to true, retains the deployment configuration during endpoint updates. */
  RetainDeploymentConfig?: boolean;
  /**
   * An array of key-value pairs to apply to this resource.
   * @uniqueItems false
   */
  Tags?: {
    /** The key of the tag. */
    Key: string;
    /** The value of the tag. */
    Value: string;
  }[];
};
