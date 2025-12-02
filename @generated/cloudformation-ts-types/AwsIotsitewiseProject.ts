// This file is auto-generated. Do not edit manually.
// Source: aws-iotsitewise-project.json

/** Resource schema for AWS::IoTSiteWise::Project */
export type AwsIotsitewiseProject = {
  /** The ID of the portal in which to create the project. */
  PortalId: string;
  /** The ID of the project. */
  ProjectId?: string;
  /** A friendly name for the project. */
  ProjectName: string;
  /** A description for the project. */
  ProjectDescription?: string;
  /** The ARN of the project. */
  ProjectArn?: string;
  /**
   * The IDs of the assets to be associated to the project.
   * @uniqueItems true
   */
  AssetIds?: string[];
  /**
   * A list of key-value pairs that contain metadata for the project.
   * @uniqueItems false
   */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
