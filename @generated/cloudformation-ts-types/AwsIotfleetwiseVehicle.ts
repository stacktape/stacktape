// This file is auto-generated. Do not edit manually.
// Source: aws-iotfleetwise-vehicle.json

/** Definition of AWS::IoTFleetWise::Vehicle Resource Type */
export type AwsIotfleetwiseVehicle = {
  Arn?: string;
  AssociationBehavior?: "CreateIotThing" | "ValidateIotThingExists";
  Attributes?: Record<string, string>;
  CreationTime?: string;
  DecoderManifestArn: string;
  /**
   * @minLength 1
   * @maxLength 100
   * @pattern ^[a-zA-Z\d\-_:]+$
   */
  Name: string;
  LastModificationTime?: string;
  ModelManifestArn: string;
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
  /**
   * @minItems 0
   * @maxItems 20
   * @uniqueItems true
   */
  StateTemplates?: ({
    /**
     * @minLength 1
     * @maxLength 100
     */
    Identifier: string;
    StateTemplateUpdateStrategy: {
      Periodic: {
        StateTemplateUpdateRate: {
          Unit: "MILLISECOND" | "SECOND" | "MINUTE" | "HOUR";
          /** @minimum 1 */
          Value: number;
        };
      };
    } | {
      OnChange: Record<string, unknown>;
    };
  })[];
};
