// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-modelmanifest.json

/** Definition of AWS::IoTFleetWise::ModelManifest Resource Type */
export type AwsIotfleetwiseModelmanifest = {
  Arn?: string;
  CreationTime?: string;
  /**
   * @minLength 1
   * @maxLength 2048
   * @pattern ^[^\u0000-\u001F\u007F]+$
   */
  Description?: string;
  LastModificationTime?: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z\d\-_:]+$
   */
  Name: string;
  /**
   * @minItems 1
   * @uniqueItems true
   */
  Nodes?: string[];
  SignalCatalogArn: string;
  Status?: "ACTIVE" | "DRAFT";
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
