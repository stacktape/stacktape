// This file is auto-generated. Do not edit manually.
// Source: aws-codestar-githubrepository.json

/** Resource Type definition for AWS::CodeStar::GitHubRepository */
export type AwsCodestarGithubrepository = {
  EnableIssues?: boolean;
  ConnectionArn?: string;
  RepositoryName: string;
  RepositoryAccessToken?: string;
  Id?: string;
  RepositoryOwner: string;
  IsPrivate?: boolean;
  Code?: {
    S3: {
      ObjectVersion?: string;
      Bucket: string;
      Key: string;
    };
  };
  RepositoryDescription?: string;
};
