// This file is auto-generated. Do not edit manually.
// Source: aws-iot-provisioningtemplate.json

/** Creates a fleet provisioning template. */
export type AwsIotProvisioningtemplate = {
  TemplateArn?: string;
  /**
   * @minLength 1
   * @maxLength 36
   * @pattern ^[0-9A-Za-z_-]+$
   */
  TemplateName?: string;
  /** @maxLength 500 */
  Description?: string;
  Enabled?: boolean;
  ProvisioningRoleArn: string;
  TemplateBody: string;
  /** @enum ["FLEET_PROVISIONING","JITP"] */
  TemplateType?: "FLEET_PROVISIONING" | "JITP";
  PreProvisioningHook?: {
    TargetArn?: string;
    PayloadVersion?: string;
  };
  /** @uniqueItems true */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
