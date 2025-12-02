// This file is auto-generated. Do not edit manually.
// Source: aws-workspaces-workspace.json

/** Resource Type definition for AWS::WorkSpaces::Workspace */
export type AwsWorkspacesWorkspace = {
  Id?: string;
  BundleId: string;
  DirectoryId: string;
  RootVolumeEncryptionEnabled?: boolean;
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
  UserName: string;
  UserVolumeEncryptionEnabled?: boolean;
  VolumeEncryptionKey?: string;
  WorkspaceProperties?: {
    ComputeTypeName?: string;
    RootVolumeSizeGib?: number;
    RunningMode?: string;
    RunningModeAutoStopTimeoutInMinutes?: number;
    UserVolumeSizeGib?: number;
  };
};
