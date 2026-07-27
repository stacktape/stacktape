// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-resourcedefaultversion.json

/** The default version of a resource that has been registered in the CloudFormation Registry. */
export type AwsCloudformationResourcedefaultversion = {
  /**
   * The ID of an existing version of the resource to set as the default.
   * @pattern ^[A-Za-z0-9-]{1,128}$
   */
  VersionId?: string;
  /**
   * The name of the type being registered.
   * We recommend that type names adhere to the following pattern:
   * company_or_organization::service::type.
   * @pattern ^[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}$
   */
  TypeName?: string;
  /**
   * The Amazon Resource Name (ARN) of the type. This is used to uniquely identify a
   * ResourceDefaultVersion
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/resource/.+$
   */
  Arn?: string;
  /**
   * The Amazon Resource Name (ARN) of the type version.
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/resource/.+$
   */
  TypeVersionArn?: string;
};
