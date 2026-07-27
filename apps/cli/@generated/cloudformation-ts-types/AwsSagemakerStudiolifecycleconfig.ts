// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-studiolifecycleconfig.json

/** Resource Type definition for AWS::SageMaker::StudioLifecycleConfig */
export type AwsSagemakerStudiolifecycleconfig = {
  /**
   * The Amazon Resource Name (ARN) of the Lifecycle Configuration.
   * @minLength 1
   * @maxLength 256
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*
   */
  StudioLifecycleConfigArn?: string;
  /**
   * The App type that the Lifecycle Configuration is attached to.
   * @enum ["JupyterServer","KernelGateway","CodeEditor","JupyterLab"]
   */
  StudioLifecycleConfigAppType: "JupyterServer" | "KernelGateway" | "CodeEditor" | "JupyterLab";
  /**
   * The content of your Amazon SageMaker Studio Lifecycle Configuration script. This content must be
   * base64 encoded.
   * @minLength 1
   * @maxLength 16384
   * @pattern [\S\s]+
   */
  StudioLifecycleConfigContent: string;
  /**
   * The name of the Amazon SageMaker Studio Lifecycle Configuration.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
   */
  StudioLifecycleConfigName: string;
  /**
   * Tags to be associated with the Lifecycle Configuration. Each tag consists of a key and an optional
   * value. Tag keys must be unique per resource. Tags are searchable using the Search API.
   * @minItems 0
   * @maxItems 50
   * @uniqueItems false
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Value: string;
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
};
