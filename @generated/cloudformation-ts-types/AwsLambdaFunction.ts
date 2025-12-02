// This file is auto-generated. Do not edit manually.
// Source: aws-lambda-function.json

/**
 * The ``AWS::Lambda::Function`` resource creates a Lambda function. To create a function, you need a
 * [deployment package](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html) and
 * an [execution role](https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html).
 * The deployment package is a .zip file archive or container image that contains your function code.
 * The execution role grants the function permission to use AWS services, such as Amazon CloudWatch
 * Logs for log streaming and AWS X-Ray for request tracing.
 * You set the package type to ``Image`` if the deployment package is a [container
 * image](https://docs.aws.amazon.com/lambda/latest/dg/lambda-images.html). For these functions,
 * include the URI of the container image in the ECR registry in the [ImageUri property of the Code
 * property](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-imageuri).
 * You do not need to specify the handler and runtime properties.
 * You set the package type to ``Zip`` if the deployment package is a [.zip file
 * archive](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html#gettingstarted-package-zip).
 * For these functions, specify the S3 location of your .zip file in the ``Code`` property.
 * Alternatively, for Node.js and Python functions, you can define your function inline in the
 * [ZipFile property of the Code
 * property](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-code.html#cfn-lambda-function-code-zipfile).
 * In both cases, you must also specify the handler and runtime properties.
 * You can use [code
 * signing](https://docs.aws.amazon.com/lambda/latest/dg/configuration-codesigning.html) if your
 * deployment package is a .zip file archive. To enable code signing for this function, specify the
 * ARN of a code-signing configuration. When a user attempts to deploy a code package with
 * ``UpdateFunctionCode``, Lambda checks that the code package has a valid signature from a trusted
 * publisher. The code-signing configuration includes a set of signing profiles, which define the
 * trusted publishers for this function.
 * When you update a ``AWS::Lambda::Function`` resource, CFNshort calls the
 * [UpdateFunctionConfiguration](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionConfiguration.html)
 * and
 * [UpdateFunctionCode](https://docs.aws.amazon.com/lambda/latest/api/API_UpdateFunctionCode.html)LAM
 * APIs under the hood. Because these calls happen sequentially, and invocations can happen between
 * these calls, your function may encounter errors in the time between the calls. For example, if you
 * remove an environment variable, and the code that references that environment variable in the same
 * CFNshort update, you may see invocation errors related to a missing environment variable. To work
 * around this, you can invoke your function against a version or alias by default, rather than the
 * ``$LATEST`` version.
 * Note that you configure [provisioned
 * concurrency](https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html) on a
 * ``AWS::Lambda::Version`` or a ``AWS::Lambda::Alias``.
 * For a complete introduction to Lambda functions, see [What is
 * Lambda?](https://docs.aws.amazon.com/lambda/latest/dg/lambda-welcome.html) in the *Lambda developer
 * guide.*
 */
export type AwsLambdaFunction = {
  /**
   * A description of the function.
   * @maxLength 256
   */
  Description?: string;
  /**
   * Set ``Mode`` to ``Active`` to sample and trace a subset of incoming requests with
   * [X-Ray](https://docs.aws.amazon.com/lambda/latest/dg/services-xray.html).
   */
  TracingConfig?: {
    /**
     * The tracing mode.
     * @enum ["Active","PassThrough"]
     */
    Mode?: "Active" | "PassThrough";
  };
  /**
   * For network connectivity to AWS resources in a VPC, specify a list of security groups and subnets
   * in the VPC. When you connect a function to a VPC, it can access resources and the internet only
   * through that VPC. For more information, see [Configuring a Lambda function to access resources in a
   * VPC](https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html).
   */
  VpcConfig?: {
    /** Allows outbound IPv6 traffic on VPC functions that are connected to dual-stack subnets. */
    Ipv6AllowedForDualStack?: boolean;
    /**
     * A list of VPC security group IDs.
     * @maxItems 5
     * @uniqueItems false
     */
    SecurityGroupIds?: string[];
    /**
     * A list of VPC subnet IDs.
     * @maxItems 16
     * @uniqueItems false
     */
    SubnetIds?: string[];
  };
  /**
   * Sets the runtime management configuration for a function's version. For more information, see
   * [Runtime updates](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html).
   */
  RuntimeManagementConfig?: {
    /**
     * Specify the runtime update mode.
     * +  *Auto (default)* - Automatically update to the most recent and secure runtime version using a
     * [Two-phase runtime version
     * rollout](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html#runtime-management-two-phase).
     * This is the best choice for most customers to ensure they always benefit from runtime updates.
     * +  *FunctionUpdate* - LAM updates the runtime of you function to the most recent and secure
     * runtime version when you update your function. This approach synchronizes runtime updates with
     * function deployments, giving you control over when runtime updates are applied and allowing you to
     * detect and mitigate rare runtime update incompatibilities early. When using this setting, you need
     * to regularly update your functions to keep their runtime up-to-date.
     * +  *Manual* - You specify a runtime version in your function configuration. The function will use
     * this runtime version indefinitely. In the rare case where a new runtime version is incompatible
     * with an existing function, this allows you to roll back your function to an earlier runtime
     * version. For more information, see [Roll back a runtime
     * version](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-update.html#runtime-management-rollback).
     * *Valid Values*: ``Auto`` | ``FunctionUpdate`` | ``Manual``
     * @enum ["Auto","FunctionUpdate","Manual"]
     */
    UpdateRuntimeOn: "Auto" | "FunctionUpdate" | "Manual";
    /**
     * The ARN of the runtime version you want the function to use.
     * This is only required if you're using the *Manual* runtime update mode.
     */
    RuntimeVersionArn?: string;
  };
  /**
   * The number of simultaneous executions to reserve for the function.
   * @minimum 0
   */
  ReservedConcurrentExecutions?: number;
  /** The function's [SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html) setting. */
  SnapStart?: {
    /**
     * Set ``ApplyOn`` to ``PublishedVersions`` to create a snapshot of the initialized execution
     * environment when you publish a function version.
     * @enum ["PublishedVersions","None"]
     */
    ApplyOn: "PublishedVersions" | "None";
  };
  /**
   * Connection settings for an Amazon EFS file system. To connect a function to a file system, a mount
   * target must be available in every Availability Zone that your function connects to. If your
   * template contains an
   * [AWS::EFS::MountTarget](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-efs-mounttarget.html)
   * resource, you must also specify a ``DependsOn`` attribute to ensure that the mount target is
   * created or updated before the function.
   * For more information about using the ``DependsOn`` attribute, see [DependsOn
   * Attribute](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html).
   * @maxItems 1
   */
  FileSystemConfigs?: {
    /**
     * The Amazon Resource Name (ARN) of the Amazon EFS access point that provides access to the file
     * system.
     * @maxLength 200
     * @pattern ^arn:aws[a-zA-Z-]*:elasticfilesystem:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:\d{12}:access-point/fsap-[a-f0-9]{17}$
     */
    Arn: string;
    /**
     * The path where the function can access the file system, starting with ``/mnt/``.
     * @maxLength 160
     * @pattern ^/mnt/[a-zA-Z0-9-_.]+$
     */
    LocalMountPath: string;
  }[];
  /**
   * The name of the Lambda function, up to 64 characters in length. If you don't specify a name, CFN
   * generates one.
   * If you specify a name, you cannot perform updates that require replacement of this resource. You
   * can perform updates that require no or some interruption. If you must replace the resource, specify
   * a new name.
   * @minLength 1
   */
  FunctionName?: string;
  /**
   * The identifier of the function's
   * [runtime](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html). Runtime is required
   * if the deployment package is a .zip file archive. Specifying a runtime results in an error if
   * you're deploying a function using a container image.
   * The following list includes deprecated runtimes. Lambda blocks creating new functions and updating
   * existing functions shortly after each runtime is deprecated. For more information, see [Runtime use
   * after
   * deprecation](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtime-deprecation-levels).
   * For a list of all currently supported runtimes, see [Supported
   * runtimes](https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html#runtimes-supported).
   */
  Runtime?: string;
  /**
   * The ARN of the KMSlong (KMS) customer managed key that's used to encrypt the following resources:
   * +  The function's [environment
   * variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-encryption).
   * +  The function's [Lambda
   * SnapStart](https://docs.aws.amazon.com/lambda/latest/dg/snapstart-security.html) snapshots.
   * +  When used with ``SourceKMSKeyArn``, the unzipped version of the .zip deployment package that's
   * used for function invocations. For more information, see [Specifying a customer managed key for
   * Lambda](https://docs.aws.amazon.com/lambda/latest/dg/encrypt-zip-package.html#enable-zip-custom-encryption).
   * +  The optimized version of the container image that's used for function invocations. Note that
   * this is not the same key that's used to protect your container image in the Amazon Elastic
   * Container Registry (Amazon ECR). For more information, see [Function
   * lifecycle](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-lifecycle).
   * If you don't provide a customer managed key, Lambda uses an [owned
   * key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-owned-cmk) or an
   * [](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-managed-cmk).
   * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
   */
  KmsKeyArn?: string;
  /**
   * The type of deployment package. Set to ``Image`` for container image and set ``Zip`` for .zip file
   * archive.
   * @enum ["Image","Zip"]
   */
  PackageType?: "Image" | "Zip";
  /**
   * To enable code signing for this function, specify the ARN of a code-signing configuration. A
   * code-signing configuration includes a set of signing profiles, which define the trusted publishers
   * for this function.
   * @pattern arn:(aws[a-zA-Z-]*)?:lambda:(eusc-)?[a-z]{2}((-gov)|(-iso([a-z]?)))?-[a-z]+-\d{1}:\d{12}:code-signing-config:csc-[a-z0-9]{17}
   */
  CodeSigningConfigArn?: string;
  /**
   * A list of [function layers](https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html)
   * to add to the function's execution environment. Specify each layer by its ARN, including the
   * version.
   * @uniqueItems false
   */
  Layers?: string[];
  TenancyConfig?: {
    /**
     * Determines how your Lambda function isolates execution environments between tenants.
     * @enum ["PER_TENANT"]
     */
    TenantIsolationMode: "PER_TENANT";
  };
  /**
   * A list of [tags](https://docs.aws.amazon.com/lambda/latest/dg/tagging.html) to apply to the
   * function.
   * You must have the ``lambda:TagResource``, ``lambda:UntagResource``, and ``lambda:ListTags``
   * permissions for your
   * [principal](https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html) to
   * manage the CFN stack. If you don't have these permissions, there might be unexpected behavior with
   * stack-level tags propagating to the resource during resource creation and update.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The value for this tag.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
    /**
     * The key for this tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
  }[];
  /**
   * Configuration values that override the container image Dockerfile settings. For more information,
   * see [Container image
   * settings](https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-parms).
   */
  ImageConfig?: {
    /** Specifies the working directory. The length of the directory string cannot exceed 1,000 characters. */
    WorkingDirectory?: string;
    /**
     * Specifies parameters that you want to pass in with ENTRYPOINT. You can specify a maximum of 1,500
     * parameters in the list.
     * @maxItems 1500
     * @uniqueItems true
     */
    Command?: string[];
    /**
     * Specifies the entry point to their application, which is typically the location of the runtime
     * executable. You can specify a maximum of 1,500 string entries in the list.
     * @maxItems 1500
     * @uniqueItems true
     */
    EntryPoint?: string[];
  };
  /**
   * The amount of [memory available to the
   * function](https://docs.aws.amazon.com/lambda/latest/dg/configuration-function-common.html#configuration-memory-console)
   * at runtime. Increasing the function memory also increases its CPU allocation. The default value is
   * 128 MB. The value can be any multiple of 1 MB. Note that new AWS accounts have reduced concurrency
   * and memory quotas. AWS raises these quotas automatically based on your usage. You can also request
   * a quota increase.
   */
  MemorySize?: number;
  /**
   * A dead-letter queue configuration that specifies the queue or topic where Lambda sends asynchronous
   * events when they fail processing. For more information, see [Dead-letter
   * queues](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html#invocation-dlq).
   */
  DeadLetterConfig?: {
    /**
     * The Amazon Resource Name (ARN) of an Amazon SQS queue or Amazon SNS topic.
     * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
     */
    TargetArn?: string;
  };
  /**
   * The amount of time (in seconds) that Lambda allows a function to run before stopping it. The
   * default is 3 seconds. The maximum allowed value is 900 seconds. For more information, see [Lambda
   * execution environment](https://docs.aws.amazon.com/lambda/latest/dg/runtimes-context.html).
   * @minimum 1
   */
  Timeout?: number;
  /**
   * The name of the method within your code that Lambda calls to run your function. Handler is required
   * if the deployment package is a .zip file archive. The format includes the file name. It can also
   * include namespaces and other qualifiers, depending on the runtime. For more information, see
   * [Lambda programming model](https://docs.aws.amazon.com/lambda/latest/dg/foundation-progmodel.html).
   * @maxLength 128
   * @pattern ^[^\s]+$
   */
  Handler?: string;
  SnapStartResponse?: {
    /**
     * When you provide a [qualified Amazon Resource Name
     * (ARN)](https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html#versioning-versions-using),
     * this response element indicates whether SnapStart is activated for the specified function version.
     * @enum ["On","Off"]
     */
    OptimizationStatus?: "On" | "Off";
    /**
     * When set to ``PublishedVersions``, Lambda creates a snapshot of the execution environment when you
     * publish a function version.
     * @enum ["PublishedVersions","None"]
     */
    ApplyOn?: "PublishedVersions" | "None";
  };
  /**
   * The code for the function. You can define your function code in multiple ways:
   * +  For .zip deployment packages, you can specify the S3 location of the .zip file in the
   * ``S3Bucket``, ``S3Key``, and ``S3ObjectVersion`` properties.
   * +  For .zip deployment packages, you can alternatively define the function code inline in the
   * ``ZipFile`` property. This method works only for Node.js and Python functions.
   * +  For container images, specify the URI of your container image in the ECR registry in the
   * ``ImageUri`` property.
   */
  Code: {
    /**
     * The ARN of the KMSlong (KMS) customer managed key that's used to encrypt your function's .zip
     * deployment package. If you don't provide a customer managed key, Lambda uses an [owned
     * key](https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html#aws-owned-cmk).
     * @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$
     */
    SourceKMSKeyArn?: string;
    /**
     * For versioned objects, the version of the deployment package object to use.
     * @minLength 1
     * @maxLength 1024
     */
    S3ObjectVersion?: string;
    /**
     * An Amazon S3 bucket in the same AWS-Region as your function. The bucket can be in a different
     * AWS-account.
     * @minLength 3
     * @maxLength 63
     * @pattern ^[0-9A-Za-z\.\-_]*(?<!\.)$
     */
    S3Bucket?: string;
    /**
     * (Node.js and Python) The source code of your Lambda function. If you include your function source
     * inline with this parameter, CFN places it in a file named ``index`` and zips it to create a
     * [deployment package](https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-package.html).
     * This zip file cannot exceed 4MB. For the ``Handler`` property, the first part of the handler
     * identifier must be ``index``. For example, ``index.handler``.
     * When you specify source code inline for a Node.js function, the ``index`` file that CFN creates
     * uses the extension ``.js``. This means that LAM treats the file as a CommonJS module. ES modules
     * aren't supported for inline functions.
     * For JSON, you must escape quotes and special characters such as newline (``\n``) with a
     * backslash.
     * If you specify a function that interacts with an AWS CloudFormation custom resource, you don't
     * have to write your own functions to send responses to the custom resource that invoked the
     * function. AWS CloudFormation provides a response module
     * ([cfn-response](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cfn-lambda-function-code-cfnresponsemodule.html))
     * that simplifies sending responses. See [Using Lambda with
     * CloudFormation](https://docs.aws.amazon.com/lambda/latest/dg/services-cloudformation.html) for
     * details.
     */
    ZipFile?: string;
    /**
     * The Amazon S3 key of the deployment package.
     * @minLength 1
     * @maxLength 1024
     */
    S3Key?: string;
    /**
     * URI of a [container image](https://docs.aws.amazon.com/lambda/latest/dg/lambda-images.html) in the
     * Amazon ECR registry.
     */
    ImageUri?: string;
  };
  /**
   * The Amazon Resource Name (ARN) of the function's execution role.
   * @pattern ^arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+$
   */
  Role: string;
  /** The function's Amazon CloudWatch Logs configuration settings. */
  LoggingConfig?: {
    /**
     * The format in which Lambda sends your function's application and system logs to CloudWatch. Select
     * between plain text and structured JSON.
     * @enum ["Text","JSON"]
     */
    LogFormat?: "Text" | "JSON";
    /**
     * Set this property to filter the application logs for your function that Lambda sends to CloudWatch.
     * Lambda only sends application logs at the selected level of detail and lower, where ``TRACE`` is
     * the highest level and ``FATAL`` is the lowest.
     * @enum ["TRACE","DEBUG","INFO","WARN","ERROR","FATAL"]
     */
    ApplicationLogLevel?: "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL";
    /**
     * The name of the Amazon CloudWatch log group the function sends logs to. By default, Lambda
     * functions send logs to a default log group named ``/aws/lambda/<function name>``. To use a
     * different log group, enter an existing log group or enter a new log group name.
     * @minLength 1
     * @maxLength 512
     * @pattern [\.\-_/#A-Za-z0-9]+
     */
    LogGroup?: string;
    /**
     * Set this property to filter the system logs for your function that Lambda sends to CloudWatch.
     * Lambda only sends system logs at the selected level of detail and lower, where ``DEBUG`` is the
     * highest level and ``WARN`` is the lowest.
     * @enum ["DEBUG","INFO","WARN"]
     */
    SystemLogLevel?: "DEBUG" | "INFO" | "WARN";
  };
  /**
   * The status of your function's recursive loop detection configuration.
   * When this value is set to ``Allow``and Lambda detects your function being invoked as part of a
   * recursive loop, it doesn't take any action.
   * When this value is set to ``Terminate`` and Lambda detects your function being invoked as part of
   * a recursive loop, it stops your function being invoked and notifies you.
   */
  RecursiveLoop?: "Allow" | "Terminate";
  /** Environment variables that are accessible from function code during execution. */
  Environment?: {
    /**
     * Environment variable key-value pairs. For more information, see [Using Lambda environment
     * variables](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html).
     * If the value of the environment variable is a time or a duration, enclose the value in quotes.
     */
    Variables?: Record<string, string>;
  };
  Arn?: string;
  /**
   * The size of the function's ``/tmp`` directory in MB. The default value is 512, but it can be any
   * whole number between 512 and 10,240 MB.
   */
  EphemeralStorage?: {
    /**
     * The size of the function's ``/tmp`` directory.
     * @minimum 512
     * @maximum 10240
     */
    Size: number;
  };
  /**
   * The instruction set architecture that the function supports. Enter a string array with one of the
   * valid values (arm64 or x86_64). The default value is ``x86_64``.
   * @minItems 1
   * @maxItems 1
   * @uniqueItems true
   */
  Architectures?: ("x86_64" | "arm64")[];
};
