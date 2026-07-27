// This file is auto-generated. Do not edit manually.
// Source: aws-cloudformation-hooktypeconfig.json

/** Specifies the configuration data for a registered hook in CloudFormation Registry. */
export type AwsCloudformationHooktypeconfig = {
  /**
   * The Amazon Resource Name (ARN) of the type without version number.
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type/hook/.+$
   */
  TypeArn?: string;
  /**
   * The name of the type being registered.
   * We recommend that type names adhere to the following pattern:
   * company_or_organization::service::type.
   * @pattern ^[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}::[A-Za-z0-9]{2,64}$
   */
  TypeName?: string;
  /**
   * The Amazon Resource Name (ARN) for the configuration data, in this account and region.
   * @pattern ^arn:aws[A-Za-z0-9-]{0,64}:cloudformation:[A-Za-z0-9-]{1,64}:([0-9]{12})?:type(-configuration)?/hook/.+$
   */
  ConfigurationArn?: string;
  /**
   * The configuration data for the extension, in this account and region.
   * @pattern [\s\S]+
   */
  Configuration?: string;
  /**
   * An alias by which to refer to this extension configuration data.
   * @default "default"
   * @pattern ^[a-zA-Z0-9]{1,256}$
   * @enum ["default"]
   */
  ConfigurationAlias?: "default";
};
