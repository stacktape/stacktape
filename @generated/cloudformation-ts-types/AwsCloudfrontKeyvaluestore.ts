// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-keyvaluestore.json

/**
 * The key value store. Use this to separate data from function code, allowing you to update data
 * without having to publish a new version of a function. The key value store holds keys and their
 * corresponding values.
 */
export type AwsCloudfrontKeyvaluestore = {
  Arn?: string;
  Id?: string;
  Status?: string;
  /** The name of the key value store. */
  Name: string;
  /** A comment for the key value store. */
  Comment?: string;
  /** The import source for the key value store. */
  ImportSource?: {
    /** The source type of the import source for the key value store. */
    SourceType: string;
    /** The Amazon Resource Name (ARN) of the import source for the key value store. */
    SourceArn: string;
  };
};
