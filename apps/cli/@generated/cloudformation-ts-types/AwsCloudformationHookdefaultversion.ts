// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-hookdefaultversion.json

/** Set a version as default version for a hook in CloudFormation Registry. */
export type AwsCloudformationHookdefaultversion = {
  /**
   * The Amazon Resource Name (ARN) of the type version.
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/hook/.+$
   */
  TypeVersionArn?: string;
  /**
   * The name of the type being registered.
   * We recommend that type names adhere to the following pattern:
   * company_or_organization::service::type.
   * @pattern ^[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}$
   */
  TypeName?: string;
  /**
   * The Amazon Resource Name (ARN) of the type. This is used to uniquely identify a HookDefaultVersion
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/hook/.+$
   */
  Arn?: string;
  /**
   * The ID of an existing version of the hook to set as the default.
   * @pattern ^[A-Za-z0-9-]{1,128}$
   */
  VersionId?: string;
};
