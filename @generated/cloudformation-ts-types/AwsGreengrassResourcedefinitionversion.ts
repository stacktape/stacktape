// This file is auto-generated. Do not edit manually.
// Source: aws-greengrass-resourcedefinitionversion.json

/** Resource Type definition for AWS::Greengrass::ResourceDefinitionVersion */
export type AwsGreengrassResourcedefinitionversion = {
  ResourceDefinitionId: string;
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
  Id?: string;
};
