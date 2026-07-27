// This file is auto-generated. Do not edit manually.
// Source: aws-workspaces-workspacespool.json

/** Resource Type definition for AWS::WorkSpaces::WorkspacesPool */
export type AwsWorkspacesWorkspacespool = {
  /** @pattern ^wspool-[0-9a-z]{9}$ */
  PoolId?: string;
  /** @pattern ^arn:aws[a-z-]{0,7}:[A-Za-z0-9][A-za-z0-9_/.-]{0,62}:[A-za-z0-9_/.-]{0,63}:[A-za-z0-9_/.-]{0,63}:[A-Za-z0-9][A-za-z0-9_/.-]{0,127}$ */
  PoolArn?: string;
  Capacity: {
    /** @minimum 0 */
    DesiredUserSessions: number;
  };
  /** @pattern ^[A-Za-z0-9][A-Za-z0-9_.-]{0,63}$ */
  PoolName: string;
  /**
   * @minLength 1
   * @maxLength 255
   * @pattern ^[a-zA-Z0-9_./() -]+$
   */
  Description?: string;
  CreatedAt?: string;
  /** @pattern ^wsb-[0-9a-z]{8,63}$ */
  BundleId: string;
  /**
   * @minLength 10
   * @maxLength 65
   * @pattern ^wsd-[0-9a-z]{8,63}$
   */
  DirectoryId: string;
  ApplicationSettings?: {
    Status: "DISABLED" | "ENABLED";
    /**
     * @maxLength 100
     * @pattern ^[A-Za-z0-9_./()!*'-]+$
     */
    SettingsGroup?: string;
  };
  TimeoutSettings?: {
    /**
     * @minimum 60
     * @maximum 36000
     */
    DisconnectTimeoutInSeconds?: number;
    /**
     * @minimum 0
     * @maximum 36000
     */
    IdleDisconnectTimeoutInSeconds?: number;
    /**
     * @minimum 600
     * @maximum 432000
     */
    MaxUserDurationInSeconds?: number;
  };
  RunningMode?: "ALWAYS_ON" | "AUTO_STOP";
  /** @uniqueItems false */
  Tags?: {
    Key: string;
    Value: string;
  }[];
};
