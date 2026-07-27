// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-app.json

/** Resource Type definition for AWS::SageMaker::App */
export type AwsSagemakerApp = {
  /**
   * The Amazon Resource Name (ARN) of the app.
   * @minLength 1
   * @maxLength 256
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:app/.*
   */
  AppArn?: string;
  /**
   * The name of the app.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
   */
  AppName: string;
  /**
   * The type of app.
   * @enum ["JupyterServer","KernelGateway","RStudioServerPro","RSessionGateway","Canvas"]
   */
  AppType: "JupyterServer" | "KernelGateway" | "RStudioServerPro" | "RSessionGateway" | "Canvas";
  /**
   * The domain ID.
   * @minLength 1
   * @maxLength 63
   */
  DomainId: string;
  /**
   * The instance type and the Amazon Resource Name (ARN) of the SageMaker image created on the
   * instance.
   */
  ResourceSpec?: {
    /**
     * The instance type that the image version runs on.
     * @enum ["system","ml.t3.micro","ml.t3.small","ml.t3.medium","ml.t3.large","ml.t3.xlarge","ml.t3.2xlarge","ml.m5.large","ml.m5.xlarge","ml.m5.2xlarge","ml.m5.4xlarge","ml.m5.8xlarge","ml.m5.12xlarge","ml.m5.16xlarge","ml.m5.24xlarge","ml.m5d.large","ml.m5d.xlarge","ml.m5d.2xlarge","ml.m5d.4xlarge","ml.m5d.8xlarge","ml.m5d.12xlarge","ml.m5d.16xlarge","ml.m5d.24xlarge","ml.c5.large","ml.c5.xlarge","ml.c5.2xlarge","ml.c5.4xlarge","ml.c5.9xlarge","ml.c5.12xlarge","ml.c5.18xlarge","ml.c5.24xlarge","ml.p3.2xlarge","ml.p3.8xlarge","ml.p3.16xlarge","ml.p3dn.24xlarge","ml.g4dn.xlarge","ml.g4dn.2xlarge","ml.g4dn.4xlarge","ml.g4dn.8xlarge","ml.g4dn.12xlarge","ml.g4dn.16xlarge","ml.r5.large","ml.r5.xlarge","ml.r5.2xlarge","ml.r5.4xlarge","ml.r5.8xlarge","ml.r5.12xlarge","ml.r5.16xlarge","ml.r5.24xlarge","ml.g5.xlarge","ml.g5.2xlarge","ml.g5.4xlarge","ml.g5.8xlarge","ml.g5.12xlarge","ml.g5.16xlarge","ml.g5.24xlarge","ml.g5.48xlarge","ml.g6.xlarge","ml.g6.2xlarge","ml.g6.4xlarge","ml.g6.8xlarge","ml.g6.12xlarge","ml.g6.16xlarge","ml.g6.24xlarge","ml.g6.48xlarge","ml.g6e.xlarge","ml.g6e.2xlarge","ml.g6e.4xlarge","ml.g6e.8xlarge","ml.g6e.12xlarge","ml.g6e.16xlarge","ml.g6e.24xlarge","ml.g6e.48xlarge","ml.geospatial.interactive","ml.p4d.24xlarge","ml.p4de.24xlarge","ml.trn1.2xlarge","ml.trn1.32xlarge","ml.trn1n.32xlarge","ml.p5.48xlarge","ml.p5e.48xlarge","ml.p5en.48xlarge","ml.m6i.large","ml.m6i.xlarge","ml.m6i.2xlarge","ml.m6i.4xlarge","ml.m6i.8xlarge","ml.m6i.12xlarge","ml.m6i.16xlarge","ml.m6i.24xlarge","ml.m6i.32xlarge","ml.m7i.large","ml.m7i.xlarge","ml.m7i.2xlarge","ml.m7i.4xlarge","ml.m7i.8xlarge","ml.m7i.12xlarge","ml.m7i.16xlarge","ml.m7i.24xlarge","ml.m7i.48xlarge","ml.c6i.large","ml.c6i.xlarge","ml.c6i.2xlarge","ml.c6i.4xlarge","ml.c6i.8xlarge","ml.c6i.12xlarge","ml.c6i.16xlarge","ml.c6i.24xlarge","ml.c6i.32xlarge","ml.c7i.large","ml.c7i.xlarge","ml.c7i.2xlarge","ml.c7i.4xlarge","ml.c7i.8xlarge","ml.c7i.12xlarge","ml.c7i.16xlarge","ml.c7i.24xlarge","ml.c7i.48xlarge","ml.r6i.large","ml.r6i.xlarge","ml.r6i.2xlarge","ml.r6i.4xlarge","ml.r6i.8xlarge","ml.r6i.12xlarge","ml.r6i.16xlarge","ml.r6i.24xlarge","ml.r6i.32xlarge","ml.r7i.large","ml.r7i.xlarge","ml.r7i.2xlarge","ml.r7i.4xlarge","ml.r7i.8xlarge","ml.r7i.12xlarge","ml.r7i.16xlarge","ml.r7i.24xlarge","ml.r7i.48xlarge","ml.m6id.large","ml.m6id.xlarge","ml.m6id.2xlarge","ml.m6id.4xlarge","ml.m6id.8xlarge","ml.m6id.12xlarge","ml.m6id.16xlarge","ml.m6id.24xlarge","ml.m6id.32xlarge","ml.c6id.large","ml.c6id.xlarge","ml.c6id.2xlarge","ml.c6id.4xlarge","ml.c6id.8xlarge","ml.c6id.12xlarge","ml.c6id.16xlarge","ml.c6id.24xlarge","ml.c6id.32xlarge","ml.r6id.large","ml.r6id.xlarge","ml.r6id.2xlarge","ml.r6id.4xlarge","ml.r6id.8xlarge","ml.r6id.12xlarge","ml.r6id.16xlarge","ml.r6id.24xlarge","ml.r6id.32xlarge"]
     */
    InstanceType?: "system" | "ml.t3.micro" | "ml.t3.small" | "ml.t3.medium" | "ml.t3.large" | "ml.t3.xlarge" | "ml.t3.2xlarge" | "ml.m5.large" | "ml.m5.xlarge" | "ml.m5.2xlarge" | "ml.m5.4xlarge" | "ml.m5.8xlarge" | "ml.m5.12xlarge" | "ml.m5.16xlarge" | "ml.m5.24xlarge" | "ml.m5d.large" | "ml.m5d.xlarge" | "ml.m5d.2xlarge" | "ml.m5d.4xlarge" | "ml.m5d.8xlarge" | "ml.m5d.12xlarge" | "ml.m5d.16xlarge" | "ml.m5d.24xlarge" | "ml.c5.large" | "ml.c5.xlarge" | "ml.c5.2xlarge" | "ml.c5.4xlarge" | "ml.c5.9xlarge" | "ml.c5.12xlarge" | "ml.c5.18xlarge" | "ml.c5.24xlarge" | "ml.p3.2xlarge" | "ml.p3.8xlarge" | "ml.p3.16xlarge" | "ml.p3dn.24xlarge" | "ml.g4dn.xlarge" | "ml.g4dn.2xlarge" | "ml.g4dn.4xlarge" | "ml.g4dn.8xlarge" | "ml.g4dn.12xlarge" | "ml.g4dn.16xlarge" | "ml.r5.large" | "ml.r5.xlarge" | "ml.r5.2xlarge" | "ml.r5.4xlarge" | "ml.r5.8xlarge" | "ml.r5.12xlarge" | "ml.r5.16xlarge" | "ml.r5.24xlarge" | "ml.g5.xlarge" | "ml.g5.2xlarge" | "ml.g5.4xlarge" | "ml.g5.8xlarge" | "ml.g5.12xlarge" | "ml.g5.16xlarge" | "ml.g5.24xlarge" | "ml.g5.48xlarge" | "ml.g6.xlarge" | "ml.g6.2xlarge" | "ml.g6.4xlarge" | "ml.g6.8xlarge" | "ml.g6.12xlarge" | "ml.g6.16xlarge" | "ml.g6.24xlarge" | "ml.g6.48xlarge" | "ml.g6e.xlarge" | "ml.g6e.2xlarge" | "ml.g6e.4xlarge" | "ml.g6e.8xlarge" | "ml.g6e.12xlarge" | "ml.g6e.16xlarge" | "ml.g6e.24xlarge" | "ml.g6e.48xlarge" | "ml.geospatial.interactive" | "ml.p4d.24xlarge" | "ml.p4de.24xlarge" | "ml.trn1.2xlarge" | "ml.trn1.32xlarge" | "ml.trn1n.32xlarge" | "ml.p5.48xlarge" | "ml.p5e.48xlarge" | "ml.p5en.48xlarge" | "ml.m6i.large" | "ml.m6i.xlarge" | "ml.m6i.2xlarge" | "ml.m6i.4xlarge" | "ml.m6i.8xlarge" | "ml.m6i.12xlarge" | "ml.m6i.16xlarge" | "ml.m6i.24xlarge" | "ml.m6i.32xlarge" | "ml.m7i.large" | "ml.m7i.xlarge" | "ml.m7i.2xlarge" | "ml.m7i.4xlarge" | "ml.m7i.8xlarge" | "ml.m7i.12xlarge" | "ml.m7i.16xlarge" | "ml.m7i.24xlarge" | "ml.m7i.48xlarge" | "ml.c6i.large" | "ml.c6i.xlarge" | "ml.c6i.2xlarge" | "ml.c6i.4xlarge" | "ml.c6i.8xlarge" | "ml.c6i.12xlarge" | "ml.c6i.16xlarge" | "ml.c6i.24xlarge" | "ml.c6i.32xlarge" | "ml.c7i.large" | "ml.c7i.xlarge" | "ml.c7i.2xlarge" | "ml.c7i.4xlarge" | "ml.c7i.8xlarge" | "ml.c7i.12xlarge" | "ml.c7i.16xlarge" | "ml.c7i.24xlarge" | "ml.c7i.48xlarge" | "ml.r6i.large" | "ml.r6i.xlarge" | "ml.r6i.2xlarge" | "ml.r6i.4xlarge" | "ml.r6i.8xlarge" | "ml.r6i.12xlarge" | "ml.r6i.16xlarge" | "ml.r6i.24xlarge" | "ml.r6i.32xlarge" | "ml.r7i.large" | "ml.r7i.xlarge" | "ml.r7i.2xlarge" | "ml.r7i.4xlarge" | "ml.r7i.8xlarge" | "ml.r7i.12xlarge" | "ml.r7i.16xlarge" | "ml.r7i.24xlarge" | "ml.r7i.48xlarge" | "ml.m6id.large" | "ml.m6id.xlarge" | "ml.m6id.2xlarge" | "ml.m6id.4xlarge" | "ml.m6id.8xlarge" | "ml.m6id.12xlarge" | "ml.m6id.16xlarge" | "ml.m6id.24xlarge" | "ml.m6id.32xlarge" | "ml.c6id.large" | "ml.c6id.xlarge" | "ml.c6id.2xlarge" | "ml.c6id.4xlarge" | "ml.c6id.8xlarge" | "ml.c6id.12xlarge" | "ml.c6id.16xlarge" | "ml.c6id.24xlarge" | "ml.c6id.32xlarge" | "ml.r6id.large" | "ml.r6id.xlarge" | "ml.r6id.2xlarge" | "ml.r6id.4xlarge" | "ml.r6id.8xlarge" | "ml.r6id.12xlarge" | "ml.r6id.16xlarge" | "ml.r6id.24xlarge" | "ml.r6id.32xlarge";
    /**
     * The ARN of the SageMaker image that the image version belongs to.
     * @minLength 1
     * @maxLength 256
     * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image/[a-z0-9]([-.]?[a-z0-9])*$
     */
    SageMakerImageArn?: string;
    /**
     * The ARN of the image version created on the instance.
     * @minLength 1
     * @maxLength 256
     * @pattern ^arn:aws(-[\w]+)*:sagemaker:.+:[0-9]{12}:image-version/[a-z0-9]([-.]?[a-z0-9])*/[0-9]+$
     */
    SageMakerImageVersionArn?: string;
    /**
     * The Amazon Resource Name (ARN) of the Lifecycle Configuration to attach to the Resource.
     * @maxLength 256
     * @pattern ^(arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*|None)$
     */
    LifecycleConfigArn?: string;
  };
  /**
   * A list of tags to apply to the app.
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
  /**
   * The user profile name.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
   */
  UserProfileName: string;
  /**
   * The lifecycle configuration that runs before the default lifecycle configuration.
   * @maxLength 256
   * @pattern ^(arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:studio-lifecycle-config/.*|None)$
   */
  BuiltInLifecycleConfigArn?: string;
  /** Indicates whether the application is launched in recovery mode. */
  RecoveryMode?: boolean;
};
