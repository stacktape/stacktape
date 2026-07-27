// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-fleet.json

/** Definition of AWS::IoTFleetWise::Fleet Resource Type */
export type AwsIotfleetwiseFleet = {
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[^\u0000-\u001F\u007F]+$
   */
  Description?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z0-9:_-]+$
   */
  Id: string;
  LastModificationTime?: string;
  SignalCatalogArn: string;
  /**
   * @minItems 0
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
