// This file is auto-generated. Do not edit manually.
// Source: aws-codebuild-project.json

/** Resource Type definition for AWS::CodeBuild::Project */
export type AwsCodebuildProject = {
  Description?: string;
  ResourceAccessRole?: string;
  VpcConfig?: {
    /** @uniqueItems false */
    Subnets?: string[];
    VpcId?: string;
    /** @uniqueItems false */
    SecurityGroupIds?: string[];
  };
  /** @uniqueItems false */
  SecondarySources?: {
    Type: string;
    ReportBuildStatus?: boolean;
    Auth?: {
      Resource?: string;
      Type: string;
    };
    SourceIdentifier?: string;
    BuildSpec?: string;
    GitCloneDepth?: number;
    BuildStatusConfig?: {
      Context?: string;
      TargetUrl?: string;
    };
    GitSubmodulesConfig?: {
      FetchSubmodules: boolean;
    };
    InsecureSsl?: boolean;
    Location?: string;
  }[];
  EncryptionKey?: string;
  /** @uniqueItems false */
  SecondaryArtifacts?: {
    Path?: string;
    Type: string;
    ArtifactIdentifier?: string;
    OverrideArtifactName?: boolean;
    Packaging?: string;
    EncryptionDisabled?: boolean;
    Location?: string;
    Name?: string;
    NamespaceType?: string;
  }[];
  Source: {
    Type: string;
    ReportBuildStatus?: boolean;
    Auth?: {
      Resource?: string;
      Type: string;
    };
    SourceIdentifier?: string;
    BuildSpec?: string;
    GitCloneDepth?: number;
    BuildStatusConfig?: {
      Context?: string;
      TargetUrl?: string;
    };
    GitSubmodulesConfig?: {
      FetchSubmodules: boolean;
    };
    InsecureSsl?: boolean;
    Location?: string;
  };
  Name?: string;
  LogsConfig?: {
    CloudWatchLogs?: {
      Status: string;
      GroupName?: string;
      StreamName?: string;
    };
    S3Logs?: {
      Status: string;
      EncryptionDisabled?: boolean;
      Location?: string;
    };
  };
  ServiceRole: string;
  QueuedTimeoutInMinutes?: number;
  /** @uniqueItems false */
  SecondarySourceVersions?: {
    SourceIdentifier: string;
    SourceVersion?: string;
  }[];
  /** @uniqueItems false */
  Tags?: {
    Value: string;
    Key: string;
  }[];
  AutoRetryLimit?: number;
  SourceVersion?: string;
  Triggers?: {
    BuildType?: string;
    /** @uniqueItems false */
    FilterGroups?: Record<string, unknown>[];
    Webhook?: boolean;
    ScopeConfiguration?: {
      Scope?: string;
      Domain?: string;
      Name: string;
    };
    PullRequestBuildPolicy?: {
      RequiresCommentApproval: string;
      /** @uniqueItems false */
      ApproverRoles?: string[];
    };
  };
  Artifacts: {
    Path?: string;
    Type: string;
    ArtifactIdentifier?: string;
    OverrideArtifactName?: boolean;
    Packaging?: string;
    EncryptionDisabled?: boolean;
    Location?: string;
    Name?: string;
    NamespaceType?: string;
  };
  BadgeEnabled?: boolean;
  /** @uniqueItems false */
  FileSystemLocations?: {
    MountPoint: string;
    Type: string;
    Identifier: string;
    MountOptions?: string;
    Location: string;
  }[];
  Environment: {
    Type: string;
    /** @uniqueItems false */
    EnvironmentVariables?: {
      Value: string;
      Type?: string;
      Name: string;
    }[];
    Fleet?: {
      FleetArn?: string;
    };
    PrivilegedMode?: boolean;
    ImagePullCredentialsType?: string;
    Image: string;
    RegistryCredential?: {
      Credential: string;
      CredentialProvider: string;
    };
    ComputeType: string;
    DockerServer?: {
      ComputeType: string;
      /** @uniqueItems false */
      SecurityGroupIds?: string[];
    };
    Certificate?: string;
  };
  ConcurrentBuildLimit?: number;
  Visibility?: string;
  Id?: string;
  Arn?: string;
  BuildBatchConfig?: {
    CombineArtifacts?: boolean;
    ServiceRole?: string;
    BatchReportMode?: string;
    TimeoutInMins?: number;
    Restrictions?: {
      /** @uniqueItems false */
      ComputeTypesAllowed?: string[];
      MaximumBuildsAllowed?: number;
    };
  };
  TimeoutInMinutes?: number;
  Cache?: {
    /** @uniqueItems false */
    Modes?: string[];
    Type: string;
    CacheNamespace?: string;
    Location?: string;
  };
};
