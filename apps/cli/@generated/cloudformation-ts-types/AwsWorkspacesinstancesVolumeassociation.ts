// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesinstances-volumeassociation.json

/** Resource Type definition for AWS::WorkspacesInstances::VolumeAssociation */
export type AwsWorkspacesinstancesVolumeassociation = {
  /**
   * ID of the workspace instance to associate with the volume
   * @pattern ^wsinst-[0-9a-zA-Z]{8,63}$
   */
  WorkspaceInstanceId: string;
  /**
   * ID of the volume to attach to the workspace instance
   * @pattern ^vol-[0-9a-zA-Z]{1,63}$
   */
  VolumeId: string;
  /**
   * The device name for the volume attachment
   * @maxLength 32
   */
  Device: string;
  /**
   * Mode to use when disassociating the volume
   * @enum ["FORCE","NO_FORCE"]
   */
  DisassociateMode?: "FORCE" | "NO_FORCE";
};
