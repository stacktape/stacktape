// This file is auto-generated. Do not edit manually.
// Source: aws-sagemaker-appimageconfig.json

/** Resource Type definition for AWS::SageMaker::AppImageConfig */
export type AwsSagemakerAppimageconfig = {
  /**
   * The Amazon Resource Name (ARN) of the AppImageConfig.
   * @minLength 1
   * @maxLength 256
   * @pattern arn:aws[a-z\-]*:sagemaker:[a-z0-9\-]*:[0-9]{12}:app-image-config/.*
   */
  AppImageConfigArn?: string;
  /**
   * The Name of the AppImageConfig.
   * @minLength 1
   * @maxLength 63
   * @pattern ^[a-zA-Z0-9](-*[a-zA-Z0-9]){0,62}
   */
  AppImageConfigName: string;
  /** The KernelGatewayImageConfig. */
  KernelGatewayImageConfig?: {
    /** The Amazon Elastic File System (EFS) storage configuration for a SageMaker image. */
    FileSystemConfig?: {
      /**
       * The default POSIX group ID (GID). If not specified, defaults to 100.
       * @minimum 0
       * @maximum 65535
       */
      DefaultGid?: number;
      /**
       * The default POSIX user ID (UID). If not specified, defaults to 1000.
       * @minimum 0
       * @maximum 65535
       */
      DefaultUid?: number;
      /**
       * The path within the image to mount the user's EFS home directory. The directory should be empty. If
       * not specified, defaults to /home/sagemaker-user.
       * @minLength 1
       * @maxLength 1024
       * @pattern ^/.*
       */
      MountPath?: string;
    };
    /**
     * The specification of the Jupyter kernels in the image.
     * @minItems 1
     * @maxItems 1
     */
    KernelSpecs: {
      /**
       * The display name of the kernel.
       * @minLength 1
       * @maxLength 1024
       */
      DisplayName?: string;
      /**
       * The name of the kernel.
       * @minLength 1
       * @maxLength 1024
       */
      Name: string;
    }[];
  };
  /** The JupyterLabAppImageConfig. */
  JupyterLabAppImageConfig?: {
    /** The container configuration for a SageMaker image. */
    ContainerConfig?: {
      /**
       * A list of arguments to apply to the container.
       * @minItems 0
       * @maxItems 50
       * @uniqueItems false
       */
      ContainerArguments?: string[];
      /**
       * The custom entry point to use on container.
       * @minItems 0
       * @maxItems 1
       * @uniqueItems false
       */
      ContainerEntrypoint?: string[];
      /**
       * A list of variables to apply to the custom container.
       * @minItems 0
       * @maxItems 25
       * @uniqueItems false
       */
      ContainerEnvironmentVariables?: {
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^(?!\s*$).+
         */
        Value: string;
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^(?!\s*$).+
         */
        Key: string;
      }[];
    };
  };
  /** The CodeEditorAppImageConfig. */
  CodeEditorAppImageConfig?: {
    /** The container configuration for a SageMaker image. */
    ContainerConfig?: {
      /**
       * A list of arguments to apply to the container.
       * @minItems 0
       * @maxItems 50
       * @uniqueItems false
       */
      ContainerArguments?: string[];
      /**
       * The custom entry point to use on container.
       * @minItems 0
       * @maxItems 1
       * @uniqueItems false
       */
      ContainerEntrypoint?: string[];
      /**
       * A list of variables to apply to the custom container.
       * @minItems 0
       * @maxItems 25
       * @uniqueItems false
       */
      ContainerEnvironmentVariables?: {
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^(?!\s*$).+
         */
        Value: string;
        /**
         * @minLength 1
         * @maxLength 256
         * @pattern ^(?!\s*$).+
         */
        Key: string;
      }[];
    };
  };
  /**
   * A list of tags to apply to the AppImageConfig.
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
