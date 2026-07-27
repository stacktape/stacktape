// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-statetemplate.json

/** Definition of AWS::IoTFleetWise::StateTemplate Resource Type */
export type AwsIotfleetwiseStatetemplate = {
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
   * @minLength 26
   * @maxLength 26
   * @pattern ^[A-Z0-9]+$
   */
  Id?: string;
  SignalCatalogArn: string;
  /**
   * @minItems 1
   * @maxItems 500
   */
  StateTemplateProperties: string[];
  /**
   * @minItems 0
   * @maxItems 5
   */
  DataExtraDimensions?: string[];
  /**
   * @minItems 0
   * @maxItems 5
   */
  MetadataExtraDimensions?: string[];
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
