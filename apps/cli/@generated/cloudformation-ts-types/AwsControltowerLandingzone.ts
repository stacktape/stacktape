// This file is auto-generated. Do not edit manually.
// Source: aws-controltower-landingzone.json

/** Definition of AWS::ControlTower::LandingZone Resource Type */
export type AwsControltowerLandingzone = {
  LandingZoneIdentifier?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:aws[0-9a-zA-Z_\-:\/]+$
   */
  Arn?: string;
  Status?: "ACTIVE" | "PROCESSING" | "FAILED";
  /**
   * @minLength 3
   * @maxLength 10
   * @pattern \d+.\d+
   */
  LatestAvailableVersion?: string;
  DriftStatus?: "DRIFTED" | "IN_SYNC";
  Manifest: unknown;
  /**
   * @minLength 3
   * @maxLength 10
   * @pattern \d+.\d+
   */
  Version: string;
  RemediationTypes?: "INHERITANCE_DRIFT"[];
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
