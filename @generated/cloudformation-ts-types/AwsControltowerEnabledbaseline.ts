// This file is auto-generated. Do not edit manually.
// Source: aws-controltower-enabledbaseline.json

/** Definition of AWS::ControlTower::EnabledBaseline Resource Type */
export type AwsControltowerEnabledbaseline = {
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  BaselineIdentifier: string;
  /** @pattern ^\d+(?:\.\d+){0,2}$ */
  BaselineVersion: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  EnabledBaselineIdentifier?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  TargetIdentifier: string;
  Parameters?: ({
    /**
     * @minLength 1
     * @maxLength 256
     */
    Key?: string;
    Value?: string | Record<string, unknown> | number | (boolean | number | Record<string, unknown> | string)[] | boolean;
  })[];
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 256
     */
    Key?: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
};
