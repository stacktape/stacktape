// This file is auto-generated. Do not edit manually.
// Source: aws-directoryservice-microsoftad.json

/** Resource Type definition for AWS::DirectoryService::MicrosoftAD */
export type AwsDirectoryserviceMicrosoftad = {
  Id?: string;
  Alias?: string;
  /** @uniqueItems false */
  DnsIpAddresses?: string[];
  CreateAlias?: boolean;
  Edition?: string;
  EnableSso?: boolean;
  Name: string;
  Password: string;
  ShortName?: string;
  VpcSettings: {
    /** @uniqueItems true */
    SubnetIds: string[];
    VpcId: string;
  };
};
