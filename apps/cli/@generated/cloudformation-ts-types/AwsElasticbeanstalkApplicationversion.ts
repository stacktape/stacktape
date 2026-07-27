// This file is auto-generated. Do not edit manually.
// Source: aws-elasticbeanstalk-applicationversion.json

/** Resource Type definition for AWS::ElasticBeanstalk::ApplicationVersion */
export type AwsElasticbeanstalkApplicationversion = {
  Id?: string;
  /** The name of the Elastic Beanstalk application that is associated with this application version. */
  ApplicationName: string;
  /** A description of this application version. */
  Description?: string;
  /** The Amazon S3 bucket and key that identify the location of the source bundle for this version. */
  SourceBundle: {
    /** The Amazon S3 bucket where the data is located. */
    S3Bucket: string;
    /** The Amazon S3 key where the data is located. */
    S3Key: string;
  };
};
