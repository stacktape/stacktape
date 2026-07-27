// This file is auto-generated. Do not edit manually.
// Source: aws-resiliencehub-app.json

/** Resource Type Definition for AWS::ResilienceHub::App. */
export type AwsResiliencehubApp = {
  /**
   * Name of the app.
   * @pattern ^[A-Za-z0-9][A-Za-z0-9_\-]{1,59}$
   */
  Name: string;
  /**
   * App description.
   * @minLength 0
   * @maxLength 500
   */
  Description?: string;
  /**
   * Amazon Resource Name (ARN) of the App.
   * @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  AppArn?: string;
  /**
   * Amazon Resource Name (ARN) of the Resiliency Policy.
   * @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9][A-Za-z0-9:_/+=,@.-]{0,1023}$
   */
  ResiliencyPolicyArn?: string;
  Tags?: Record<string, string>;
  /**
   * A string containing full ResilienceHub app template body.
   * @minLength 0
   * @maxLength 409600
   * @pattern ^[\w\s:,-\.'\/{}\[\]:"]+$
   */
  AppTemplateBody: string;
  /**
   * An array of ResourceMapping objects.
   * @uniqueItems false
   */
  ResourceMappings: {
    LogicalStackName?: string;
    /** @pattern CfnStack|Resource|Terraform|EKS */
    MappingType: string;
    /** @pattern ^[A-Za-z0-9][A-Za-z0-9_\-]{1,59}$ */
    ResourceName?: string;
    TerraformSourceName?: string;
    EksSourceName?: string;
    PhysicalResourceId: {
      /** @pattern ^[0-9]{12}$ */
      AwsAccountId?: string;
      /** @pattern ^[a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]$ */
      AwsRegion?: string;
      /**
       * @minLength 1
       * @maxLength 255
       */
      Identifier: string;
      /** @pattern Arn|Native */
      Type: string;
    };
  }[];
  /**
   * Assessment execution schedule.
   * @enum ["Disabled","Daily"]
   */
  AppAssessmentSchedule?: "Disabled" | "Daily";
  PermissionModel?: {
    /**
     * Defines how AWS Resilience Hub scans your resources. It can scan for the resources by using a
     * pre-existing role in your AWS account, or by using the credentials of the current IAM user.
     * @enum ["LegacyIAMUser","RoleBased"]
     */
    Type: "LegacyIAMUser" | "RoleBased";
    /**
     * Existing AWS IAM role name in the primary AWS account that will be assumed by AWS Resilience Hub
     * Service Principle to obtain a read-only access to your application resources while running an
     * assessment.
     * @pattern ((\u002F[\u0021-\u007E]+\u002F){1,511})?[A-Za-z0-9+=,.@_/-]{1,64}
     */
    InvokerRoleName?: string;
    /**
     * Defines a list of role Amazon Resource Names (ARNs) to be used in other accounts. These ARNs are
     * used for querying purposes while importing resources and assessing your application.
     * @uniqueItems false
     */
    CrossAccountRoleArns?: string[];
  };
  /**
   * The list of events you would like to subscribe and get notification for.
   * @uniqueItems false
   */
  EventSubscriptions?: ({
    /**
     * Unique name to identify an event subscription.
     * @maxLength 256
     */
    Name: string;
    /**
     * The type of event you would like to subscribe and get notification for.
     * @enum ["ScheduledAssessmentFailure","DriftDetected"]
     */
    EventType: "ScheduledAssessmentFailure" | "DriftDetected";
    /**
     * Amazon Resource Name (ARN) of the Amazon Simple Notification Service topic.
     * @pattern ^arn:(aws|aws-cn|aws-iso|aws-iso-[a-z]{1}|aws-us-gov):[A-Za-z0-9][A-Za-z0-9_/.-]{0,62}:([a-z]{2}-((iso[a-z]{0,1}-)|(gov-)){0,1}[a-z]+-[0-9]):[0-9]{12}:[A-Za-z0-9/][A-Za-z0-9:_/+.-]{0,1023}$
     */
    SnsTopicArn?: string;
  })[];
  /**
   * Indicates if compliance drifts (deviations) were detected while running an assessment for your
   * application.
   * @enum ["NotChecked","NotDetected","Detected"]
   */
  DriftStatus?: "NotChecked" | "NotDetected" | "Detected";
};
