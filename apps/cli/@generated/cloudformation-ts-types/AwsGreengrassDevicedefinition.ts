// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-devicedefinition.json

/** Resource Type definition for AWS::Greengrass::DeviceDefinition */
export type AwsGreengrassDevicedefinition = {
  LatestVersionArn?: string;
  Id?: string;
  Arn?: string;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Devices: {
      SyncShadow?: boolean;
      ThingArn: string;
      Id: string;
      CertificateArn: string;
    }[];
  };
  Tags?: Record<string, unknown>;
};
