// This file is auto-generated. Do not edit manually.
// Source: aws-resourcegroups-tagsynctask.json

/** Schema for ResourceGroups::TagSyncTask */
export type AwsResourcegroupsTagsynctask = {
  /**
   * The Amazon resource name (ARN) or name of the application group for which you want to create a
   * tag-sync task
   * @minLength 12
   * @maxLength 1600
   * @pattern ([a-zA-Z0-9_\\.-]{1,150}/[a-z0-9]{26})|(arn:aws(-[a-z]+)*:resource-groups(-(test|beta|gamma))?:[a-z]{2}(-[a-z]+)+-\d{1}:[0-9]{12}:group/[a-zA-Z0-9_\\.-]{1,150}/[a-z0-9]{26})
   */
  Group: string;
  /**
   * The Amazon resource name (ARN) of the ApplicationGroup for which the TagSyncTask is created
   * @minLength 12
   * @maxLength 1600
   * @pattern arn:aws(-[a-z]+)*:resource-groups(-(test|beta|gamma))?:[a-z]{2}(-[a-z]+)+-\d{1}:[0-9]{12}:group/[a-zA-Z0-9_\.-]{1,150}/[a-z0-9]{26}
   */
  GroupArn?: string;
  /**
   * The Name of the application group for which the TagSyncTask is created
   * @minLength 1
   * @maxLength 300
   * @pattern [a-zA-Z0-9_\.-]{1,150}/[a-z0-9]{26}
   */
  GroupName?: string;
  /**
   * The ARN of the TagSyncTask resource
   * @minLength 12
   * @maxLength 1600
   * @pattern arn:aws(-[a-z]+)*:resource-groups(-(test|beta|gamma))?:[a-z]{2}(-[a-z]+)+-\d{1}:[0-9]{12}:group/[a-zA-Z0-9_\.-]{1,150}/[a-z0-9]{26}/tag-sync-task/[a-z0-9]{26}
   */
  TaskArn?: string;
  /**
   * The tag key. Resources tagged with this tag key-value pair will be added to the application. If a
   * resource with this tag is later untagged, the tag-sync task removes the resource from the
   * application.
   * @minLength 1
   * @maxLength 128
   * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
   */
  TagKey: string;
  /**
   * The tag value. Resources tagged with this tag key-value pair will be added to the application. If a
   * resource with this tag is later untagged, the tag-sync task removes the resource from the
   * application.
   * @minLength 0
   * @maxLength 256
   * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
   */
  TagValue: string;
  /**
   * The Amazon resource name (ARN) of the role assumed by the service to tag and untag resources on
   * your behalf.
   * @minLength 20
   * @maxLength 2048
   * @pattern arn:(aws[a-zA-Z-]*)?:iam::\d{12}:role/?[a-zA-Z_0-9+=,.@\-_/]+
   */
  RoleArn: string;
  /**
   * The status of the TagSyncTask
   * @enum ["ACTIVE","ERROR"]
   */
  Status?: "ACTIVE" | "ERROR";
};
