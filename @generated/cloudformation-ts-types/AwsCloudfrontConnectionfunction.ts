// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-connectionfunction.json

/** Resource Type definition for AWS::CloudFront::ConnectionFunction */
export type AwsCloudfrontConnectionfunction = {
  Id?: string;
  Name: string;
  ConnectionFunctionArn?: string;
  ConnectionFunctionCode: string;
  ConnectionFunctionConfig: {
    Comment: string;
    /** @enum ["cloudfront-js-2.0"] */
    Runtime: "cloudfront-js-2.0";
    /** @uniqueItems true */
    KeyValueStoreAssociations?: {
      KeyValueStoreARN: string;
    }[];
  };
  /** @default false */
  AutoPublish?: boolean;
  /** @enum ["DEVELOPMENT","LIVE"] */
  Stage?: "DEVELOPMENT" | "LIVE";
  /** @enum ["UNPUBLISHED","DEPLOYED","UNASSOCIATED","PUBLISHING","IN_PROGRESS"] */
  Status?: "UNPUBLISHED" | "DEPLOYED" | "UNASSOCIATED" | "PUBLISHING" | "IN_PROGRESS";
  ETag?: string;
  CreatedTime?: string;
  LastModifiedTime?: string;
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^[a-zA-Z0-9 _.:/=+\-@]{1,128}\Z
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^[a-zA-Z0-9 _.:/=+\-@]{0,256}\Z
     */
    Value: string;
  }[];
};
