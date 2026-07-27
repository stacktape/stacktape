// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-portal.json

/** Resource schema for AWS::IoTSiteWise::Portal */
export type AwsIotsitewisePortal = {
  /**
   * The service to use to authenticate users to the portal. Choose from SSO or IAM. You can't change
   * this value after you create a portal.
   */
  PortalAuthMode?: string;
  /** The ARN of the portal, which has the following format. */
  PortalArn?: string;
  /** The AWS SSO application generated client ID (used with AWS SSO APIs). */
  PortalClientId?: string;
  /** The AWS administrator's contact email address. */
  PortalContactEmail: string;
  /** A description for the portal. */
  PortalDescription?: string;
  /** The ID of the portal. */
  PortalId?: string;
  /** A friendly name for the portal. */
  PortalName: string;
  /** The public root URL for the AWS IoT AWS IoT SiteWise Monitor application portal. */
  PortalStartUrl?: string;
  /**
   * The type of portal
   * @enum ["SITEWISE_PORTAL_V1","SITEWISE_PORTAL_V2"]
   */
  PortalType?: "SITEWISE_PORTAL_V1" | "SITEWISE_PORTAL_V2";
  PortalTypeConfiguration?: Record<string, {
    PortalTools: string[];
  }>;
  /**
   * The ARN of a service role that allows the portal's users to access your AWS IoT SiteWise resources
   * on your behalf.
   */
  RoleArn: string;
  /** The email address that sends alarm notifications. */
  NotificationSenderEmail?: string;
  /**
   * Contains the configuration information of an alarm created in an AWS IoT SiteWise Monitor portal.
   * You can use the alarm to monitor an asset property and get notified when the asset property value
   * is outside a specified range.
   */
  Alarms?: {
    /**
     * The ARN of the IAM role that allows the alarm to perform actions and access AWS resources and
     * services, such as AWS IoT Events.
     */
    AlarmRoleArn?: string;
    /**
     * The ARN of the AWS Lambda function that manages alarm notifications. For more information, see
     * Managing alarm notifications in the AWS IoT Events Developer Guide.
     */
    NotificationLambdaArn?: string;
  };
  /**
   * A list of key-value pairs that contain metadata for the portal.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
