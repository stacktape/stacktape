// This file is auto-generated. Do not edit manually.
// Source: aws-codecommit-repository.json

/** Resource Type definition for AWS::CodeCommit::Repository */
export type AwsCodecommitRepository = {
  CloneUrlHttp?: string;
  KmsKeyId?: string;
  CloneUrlSsh?: string;
  RepositoryName: string;
  /** @uniqueItems false */
  Triggers?: {
    CustomData?: string;
    /** @uniqueItems false */
    Events: string[];
    /** @uniqueItems false */
    Branches?: string[];
    DestinationArn: string;
    Name: string;
  }[];
  Id?: string;
  Arn?: string;
  Code?: {
    S3: {
      ObjectVersion?: string;
      Bucket: string;
      Key: string;
    };
    BranchName?: string;
  };
  RepositoryDescription?: string;
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  Name?: string;
};
