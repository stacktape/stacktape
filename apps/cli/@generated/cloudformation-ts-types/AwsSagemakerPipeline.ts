// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-pipeline.json

/** Resource Type definition for AWS::SageMaker::Pipeline */
export type AwsSagemakerPipeline = {
  /**
   * The name of the Pipeline.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*
   */
  PipelineName: string;
  /**
   * The display name of the Pipeline.
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9])*
   */
  PipelineDisplayName?: string;
  /**
   * The description of the Pipeline.
   * @minLength 0
   * @maxLength 3072
   */
  PipelineDescription?: string;
  PipelineDefinition: unknown | unknown;
  /**
   * Role Arn
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[a-z\-]*:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  RoleArn: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  ParallelismConfiguration?: {
    /**
     * Maximum parallel execution steps
     * @minimum 1
     */
    MaxParallelExecutionSteps: number;
  };
};
