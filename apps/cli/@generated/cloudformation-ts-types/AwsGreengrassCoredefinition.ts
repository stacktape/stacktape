// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-coredefinition.json

/** Resource Type definition for AWS::Greengrass::CoreDefinition */
export type AwsGreengrassCoredefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Cores: {
      SyncShadow?: boolean;
      ThingArn: string;
      Id: string;
      CertificateArn: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
