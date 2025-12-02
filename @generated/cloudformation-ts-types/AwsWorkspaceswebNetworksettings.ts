// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-networksettings.json

/** Definition of AWS::WorkSpacesWeb::NetworkSettings Resource Type */
export type AwsWorkspaceswebNetworksettings = {
  AssociatedPortalArns?: string[];
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  NetworkSettingsArn?: string;
  /**
   * @minItems 1
   * @maxItems 5
   */
  SecurityGroupIds: string[];
  /**
   * @minItems 2
   * @maxItems 3
   */
  SubnetIds: string[];
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^vpc-[0-9a-z]*$
   */
  VpcId: string;
};
