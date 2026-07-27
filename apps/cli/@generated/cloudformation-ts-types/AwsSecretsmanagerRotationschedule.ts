// This file is auto-generated. Do not edit manually.
// Source: aws-secretsmanager-rotationschedule.json

/** Resource Type definition for AWS::SecretsManager::RotationSchedule */
export type AwsSecretsmanagerRotationschedule = {
  /**
   * Creates a new Lambda rotation function based on one of the Secrets Manager rotation function
   * templates. To use a rotation function that already exists, specify RotationLambdaARN instead.
   */
  HostedRotationLambda?: {
    /** The python runtime associated with the Lambda function */
    Runtime?: string;
    /**
     * The ARN of the KMS key that Secrets Manager uses to encrypt the secret. If you don't specify this
     * value, then Secrets Manager uses the key aws/secretsmanager. If aws/secretsmanager doesn't yet
     * exist, then Secrets Manager creates it for you automatically the first time it encrypts the secret
     * value.
     */
    KmsKeyArn?: string;
    /**
     * The ARN of the secret that contains superuser credentials, if you use the alternating users
     * rotation strategy. CloudFormation grants the execution role for the Lambda rotation function
     * GetSecretValue permission to the secret in this property.
     */
    MasterSecretArn?: string;
    /** The name of the Lambda rotation function. */
    RotationLambdaName?: string;
    /** The type of rotation template to use */
    RotationType: string;
    /** A string of the characters that you don't want in the password. */
    ExcludeCharacters?: string;
    /** A comma-separated list of security group IDs applied to the target database. */
    VpcSecurityGroupIds?: string;
    /**
     * The ARN of the KMS key that Secrets Manager used to encrypt the superuser secret, if you use the
     * alternating users strategy and the superuser secret is encrypted with a customer managed key. You
     * don't need to specify this property if the superuser secret is encrypted using the key
     * aws/secretsmanager. CloudFormation grants the execution role for the Lambda rotation function
     * Decrypt, DescribeKey, and GenerateDataKey permission to the key in this property.
     */
    MasterSecretKmsKeyArn?: string;
    /**
     * The ARN of the secret that contains superuser credentials, if you use the alternating users
     * rotation strategy. CloudFormation grants the execution role for the Lambda rotation function
     * GetSecretValue permission to the secret in this property.
     */
    SuperuserSecretArn?: string;
    /**
     * The ARN of the KMS key that Secrets Manager used to encrypt the superuser secret, if you use the
     * alternating users strategy and the superuser secret is encrypted with a customer managed key. You
     * don't need to specify this property if the superuser secret is encrypted using the key
     * aws/secretsmanager. CloudFormation grants the execution role for the Lambda rotation function
     * Decrypt, DescribeKey, and GenerateDataKey permission to the key in this property.
     */
    SuperuserSecretKmsKeyArn?: string;
    /**
     * A comma separated list of VPC subnet IDs of the target database network. The Lambda rotation
     * function is in the same subnet group.
     */
    VpcSubnetIds?: string;
  };
  /** The ARN or name of the secret to rotate. */
  SecretId: string;
  /**
   * The list of metadata needed to successfully rotate a managed external secret.
   * @uniqueItems false
   */
  ExternalSecretRotationMetadata?: {
    /** The value for the metadata item. You can specify a value that's 1 to 2048 characters in length. */
    Value: string;
    /** The key name of the metadata item. You can specify a value that's 1 to 256 characters in length. */
    Key: string;
  }[];
  /** The ARN of the secret. */
  Id?: string;
  /** The ARN of the IAM role that is used by Secrets Manager to rotate a managed external secret. */
  ExternalSecretRotationRoleArn?: string;
  /**
   * Specifies whether to rotate the secret immediately or wait until the next scheduled rotation
   * window.
   */
  RotateImmediatelyOnUpdate?: boolean;
  /**
   * The ARN of an existing Lambda rotation function. To specify a rotation function that is also
   * defined in this template, use the Ref function.
   */
  RotationLambdaARN?: string;
  /** A structure that defines the rotation configuration for this secret. */
  RotationRules?: {
    /**
     * A cron() or rate() expression that defines the schedule for rotating your secret. Secrets Manager
     * rotation schedules use UTC time zone.
     */
    ScheduleExpression?: string;
    /**
     * The length of the rotation window in hours, for example 3h for a three hour window. Secrets Manager
     * rotates your secret at any time during this window. The window must not extend into the next
     * rotation window or the next UTC day. The window starts according to the ScheduleExpression. If you
     * don't specify a Duration, for a ScheduleExpression in hours, the window automatically closes after
     * one hour. For a ScheduleExpression in days, the window automatically closes at the end of the UTC
     * day.
     */
    Duration?: string;
    /**
     * The number of days between automatic scheduled rotations of the secret. You can use this value to
     * check that your secret meets your compliance guidelines for how often secrets must be rotated.
     */
    AutomaticallyAfterDays?: number;
  };
};
