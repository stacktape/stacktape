// This file is auto-generated. Do not edit manually.
// Source: aws-controltower-enabledcontrol.json

/** Enables a control on a specified target. */
export type AwsControltowerEnabledcontrol = {
  /**
   * Arn of the control.
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  ControlIdentifier: string;
  /**
   * Arn for Organizational unit to which the control needs to be applied
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  TargetIdentifier: string;
  /**
   * Parameters to configure the enabled control behavior.
   * @minItems 1
   */
  Parameters?: ({
    Value: (string | number | Record<string, unknown> | boolean)[] | string | number | Record<string, unknown> | boolean;
    Key: string;
  })[];
  /**
   * A set of tags to assign to the enabled control.
   * @minItems 1
   * @maxItems 50
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
