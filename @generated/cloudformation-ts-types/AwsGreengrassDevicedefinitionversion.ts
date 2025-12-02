// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-devicedefinitionversion.json

/** Resource Type definition for AWS::Greengrass::DeviceDefinitionVersion */
export type AwsGreengrassDevicedefinitionversion = {
  Id?: string;
  DeviceDefinitionId: string;
  /** @uniqueItems false */
  Devices: {
    SyncShadow?: boolean;
    ThingArn: string;
    Id: string;
    CertificateArn: string;
  }[];
};
