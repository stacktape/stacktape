// This file is auto-generated. Do not edit manually.
// Source: aws-cloudfront-streamingdistribution.json

/** Resource Type definition for AWS::CloudFront::StreamingDistribution */
export type AwsCloudfrontStreamingdistribution = {
  Id?: string;
  DomainName?: string;
  StreamingDistributionConfig: {
    Logging?: {
      Bucket: string;
      Enabled: boolean;
      Prefix: string;
    };
    Comment: string;
    PriceClass?: string;
    S3Origin: {
      DomainName: string;
      OriginAccessIdentity: string;
    };
    Enabled: boolean;
    /** @uniqueItems false */
    Aliases?: string[];
    TrustedSigners: {
      Enabled: boolean;
      /** @uniqueItems false */
      AwsAccountNumbers?: string[];
    };
  };
  /** @uniqueItems false */
  Tags: {
    Key: string;
    Value: string;
  }[];
};
