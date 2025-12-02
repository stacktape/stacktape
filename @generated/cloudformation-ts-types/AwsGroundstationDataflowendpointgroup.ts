// This file is auto-generated. Do not edit manually.
// Source: aws-groundstation-dataflowendpointgroup.json

/** AWS Ground Station DataflowEndpointGroup schema for CloudFormation */
export type AwsGroundstationDataflowendpointgroup = {
  Id?: string;
  /** @pattern ^(arn:(aws[a-zA-Z-]*)?:[a-z0-9-.]+:.*)|()$ */
  Arn?: string;
  /** @minItems 1 */
  EndpointDetails: (unknown | unknown)[];
  /**
   * Amount of time, in seconds, before a contact starts that the Ground Station Dataflow Endpoint Group
   * will be in a PREPASS state. A Ground Station Dataflow Endpoint Group State Change event will be
   * emitted when the Dataflow Endpoint Group enters and exits the PREPASS state.
   */
  ContactPrePassDurationSeconds?: number;
  /**
   * Amount of time, in seconds, after a contact ends that the Ground Station Dataflow Endpoint Group
   * will be in a POSTPASS state. A Ground Station Dataflow Endpoint Group State Change event will be
   * emitted when the Dataflow Endpoint Group enters and exits the POSTPASS state.
   */
  ContactPostPassDurationSeconds?: number;
  Tags?: {
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,128}$ */
    Key: string;
    /** @pattern ^[ a-zA-Z0-9\+\-=._:/@]{1,256}$ */
    Value: string;
  }[];
};
