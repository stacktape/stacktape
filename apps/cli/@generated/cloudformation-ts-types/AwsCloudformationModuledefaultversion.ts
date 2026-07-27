// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-moduledefaultversion.json

/** A module that has been registered in the CloudFormation registry as the default version */
export type AwsCloudformationModuledefaultversion = {
  /**
   * The Amazon Resource Name (ARN) of the module version to set as the default version.
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/module/.+/[0-9]{8}$
   */
  Arn?: string;
  /**
   * The name of a module existing in the registry.
   * @pattern ^[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::MODULE
   */
  ModuleName?: string;
  /**
   * The ID of an existing version of the named module to set as the default.
   * @pattern ^[0-9]{8}$
   */
  VersionId?: string;
};
