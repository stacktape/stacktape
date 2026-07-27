// This file is auto-generated. Do not edit manually.
// Source: aws-imagebuilder-distributionconfiguration.json

/** Resource schema for AWS::ImageBuilder::DistributionConfiguration */
export type AwsImagebuilderDistributionconfiguration = {
  /** The Amazon Resource Name (ARN) of the distribution configuration. */
  Arn?: string;
  /** The name of the distribution configuration. */
  Name: string;
  /** The description of the distribution configuration. */
  Description?: string;
  /** The distributions of the distribution configuration. */
  Distributions: ({
    /** region */
    Region: string;
    AmiDistributionConfiguration?: {
      /** The name of the AMI distribution configuration. */
      Name?: string;
      /** The KMS key identifier used to encrypt the distributed image. */
      KmsKeyId?: string;
      /** The description of the AMI distribution configuration. */
      Description?: string;
      /** The tags to apply to AMIs distributed to this Region. */
      AmiTags?: Record<string, string>;
      /** The ID of accounts to which you want to distribute an image. */
      TargetAccountIds?: string[];
      LaunchPermissionConfiguration?: {
        /** The AWS account ID. */
        UserIds?: string[];
        /** The name of the group. */
        UserGroups?: string[];
        /** The ARN for an Amazon Web Services Organization that you want to share your AMI with. */
        OrganizationArns?: string[];
        /** The ARN for an Organizations organizational unit (OU) that you want to share your AMI with. */
        OrganizationalUnitArns?: string[];
      };
    };
    ContainerDistributionConfiguration?: {
      /** The description of the container distribution configuration. */
      Description?: string;
      /** Tags that are attached to the container distribution configuration. */
      ContainerTags?: string[];
      /** The destination repository for the container distribution configuration. */
      TargetRepository?: {
        /**
         * The service of target container repository.
         * @enum ["ECR"]
         */
        Service?: "ECR";
        /** The repository name of target container repository. */
        RepositoryName?: string;
      };
    };
    /** The License Manager Configuration to associate with the AMI in the specified Region. */
    LicenseConfigurationArns?: string[];
    /** A group of launchTemplateConfiguration settings that apply to image distribution. */
    LaunchTemplateConfigurations?: {
      /** Identifies the EC2 launch template to use. */
      LaunchTemplateId?: string;
      /** The account ID that this configuration applies to. */
      AccountId?: string;
      /** Set the specified EC2 launch template as the default launch template for the specified account. */
      SetDefaultVersion?: boolean;
    }[];
    /** The Windows faster-launching configurations to use for AMI distribution. */
    FastLaunchConfigurations?: {
      /** The owner account ID for the fast-launch enabled Windows AMI. */
      AccountId?: string;
      /**
       * A Boolean that represents the current state of faster launching for the Windows AMI. Set to true to
       * start using Windows faster launching, or false to stop using it.
       */
      Enabled?: boolean;
      /**
       * The launch template that the fast-launch enabled Windows AMI uses when it launches Windows
       * instances to create pre-provisioned snapshots.
       */
      LaunchTemplate?: {
        /** The ID of the launch template to use for faster launching for a Windows AMI. */
        LaunchTemplateId?: string;
        /** The name of the launch template to use for faster launching for a Windows AMI. */
        LaunchTemplateName?: string;
        /** The version of the launch template to use for faster launching for a Windows AMI. */
        LaunchTemplateVersion?: string;
      };
      /** The maximum number of parallel instances that are launched for creating resources. */
      MaxParallelLaunches?: number;
      /**
       * Configuration settings for managing the number of snapshots that are created from pre-provisioned
       * instances for the Windows AMI when faster launching is enabled.
       */
      SnapshotConfiguration?: {
        /** The number of pre-provisioned snapshots to keep on hand for a fast-launch enabled Windows AMI. */
        TargetResourceCount?: number;
      };
    }[];
    /** The SSM parameter configurations to use for AMI distribution. */
    SsmParameterConfigurations?: ({
      /** The account ID for the AMI to update the parameter with. */
      AmiAccountId?: string;
      /** The name of the SSM parameter. */
      ParameterName: string;
      /**
       * The data type of the SSM parameter.
       * @enum ["text","aws:ec2:image"]
       */
      DataType?: "text" | "aws:ec2:image";
    })[];
  })[];
  /** The tags associated with the component. */
  Tags?: Record<string, string>;
};
