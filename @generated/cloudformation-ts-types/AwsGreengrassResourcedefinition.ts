// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-resourcedefinition.json

/** Resource Type definition for AWS::Greengrass::ResourceDefinition */
export type AwsGreengrassResourcedefinition = {
  Id?: string;
  Arn?: string;
  LatestVersionArn?: string;
  Tags?: Record<string, unknown>;
  Name: string;
  InitialVersion?: {
    /** @uniqueItems false */
    Resources: {
      ResourceDataContainer: {
        LocalVolumeResourceData?: {
          SourcePath: string;
          DestinationPath: string;
          GroupOwnerSetting?: {
            AutoAddGroupOwner: boolean;
            GroupOwner?: string;
          };
        };
        LocalDeviceResourceData?: {
          SourcePath: string;
          GroupOwnerSetting?: {
            AutoAddGroupOwner: boolean;
            GroupOwner?: string;
          };
        };
        S3MachineLearningModelResourceData?: {
          OwnerSetting?: {
            GroupPermission: string;
            GroupOwner: string;
          };
          DestinationPath: string;
          S3Uri: string;
        };
        SecretsManagerSecretResourceData?: {
          ARN: string;
          /** @uniqueItems false */
          AdditionalStagingLabelsToDownload?: string[];
        };
        SageMakerMachineLearningModelResourceData?: {
          OwnerSetting?: {
            GroupPermission: string;
            GroupOwner: string;
          };
          SageMakerJobArn: string;
          DestinationPath: string;
        };
      };
      Id: string;
      Name: string;
    }[];
  };
};
