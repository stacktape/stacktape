// This file is auto-generated. Do not edit manually.
// Source: aws-ses-multiregionendpoint.json

/** Resource Type definition for AWS::SES::MultiRegionEndpoint */
export type AwsSesMultiregionendpoint = {
  /**
   * The name of the multi-region endpoint (global-endpoint).
   * @minLength 1
   * @maxLength 64
   * @pattern ^[\w\-_]+$
   */
  EndpointName: string;
  Tags?: {
    /**
     * One part of a key-value pair that defines a tag.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The optional part of a key-value pair that defines a tag.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  Details: {
    RouteDetails: {
      Region: string;
    }[];
  };
};
