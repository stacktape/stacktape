// This file is auto-generated. Do not edit manually.
// Source: aws-rtbfabric-outboundexternallink.json

/** Resource Type definition for AWS::RTBFabric::OutboundExternalLink Resource Type */
export type AwsRtbfabricOutboundexternallink = {
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value?: string;
  }[];
  LinkId?: string;
  GatewayId: string;
  PublicEndpoint: string;
  LinkAttributes?: {
    /**
     * @minItems 1
     * @maxItems 200
     * @uniqueItems false
     */
    ResponderErrorMasking?: ({
      /**
       * @minLength 3
       * @maxLength 7
       * @pattern ^DEFAULT|4XX|5XX|\d{3}$
       */
      HttpCode: string;
      /** @enum ["NO_BID","PASSTHROUGH"] */
      Action: "NO_BID" | "PASSTHROUGH";
      /**
       * @minItems 1
       * @maxItems 2
       * @uniqueItems true
       */
      LoggingTypes: ("NONE" | "METRIC" | "RESPONSE")[];
      /**
       * @minimum 0
       * @maximum 100
       */
      ResponseLoggingPercentage?: number;
    })[];
    CustomerProvidedId?: string;
  };
  LinkLogSettings: {
    ApplicationLogs: {
      LinkApplicationLogSampling: {
        /**
         * @minimum 0
         * @maximum 100
         */
        ErrorLog: number;
        /**
         * @minimum 0
         * @maximum 100
         */
        FilterLog: number;
      };
    };
  };
  LinkStatus?: "PENDING_CREATION" | "PENDING_REQUEST" | "REQUESTED" | "ACCEPTED" | "ACTIVE" | "REJECTED" | "FAILED" | "PENDING_DELETION" | "DELETED" | "PENDING_UPDATE" | "PENDING_ISOLATION" | "ISOLATED" | "PENDING_RESTORATION" | "UNKNOWN_TO_SDK_VERSION";
  CreatedTimestamp?: string;
  UpdatedTimestamp?: string;
  Arn?: string;
};
