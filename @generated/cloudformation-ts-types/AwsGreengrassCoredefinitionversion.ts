// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-coredefinitionversion.json

/** Resource Type definition for AWS::Greengrass::CoreDefinitionVersion */
export type AwsGreengrassCoredefinitionversion = {
  Id?: string;
  /** @uniqueItems false */
  Cores: {
    SyncShadow?: boolean;
    ThingArn: string;
    Id: string;
    CertificateArn: string;
  }[];
  CoreDefinitionId: string;
};
