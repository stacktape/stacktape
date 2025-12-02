// This file is auto-generated. Do not edit manually.
// Source: aws-nimblestudio-launchprofile.json

/**
 * Represents a launch profile which delegates access to a collection of studio components to studio
 * users
 */
export type AwsNimblestudioLaunchprofile = {
  /**
   * <p>The description.</p>
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * <p>Specifies the IDs of the EC2 subnets where streaming sessions will be accessible from.
   * These subnets must support the specified instance types. </p>
   * @minItems 0
   * @maxItems 6
   */
  Ec2SubnetIds: string[];
  LaunchProfileId?: string;
  /**
   * <p>The version number of the protocol that is used by the launch profile. The only valid
   * version is "2021-03-31".</p>
   */
  LaunchProfileProtocolVersions: string[];
  /**
   * <p>The name for the launch profile.</p>
   * @minLength 1
   * @maxLength 64
   */
  Name: string;
  StreamConfiguration: {
    ClipboardMode: "ENABLED" | "DISABLED";
    /**
     * <p>The EC2 instance types that users can select from when launching a streaming session
     * with this launch profile.</p>
     * @minItems 1
     * @maxItems 30
     */
    Ec2InstanceTypes: ("g4dn.xlarge" | "g4dn.2xlarge" | "g4dn.4xlarge" | "g4dn.8xlarge" | "g4dn.12xlarge" | "g4dn.16xlarge" | "g3.4xlarge" | "g3s.xlarge" | "g5.xlarge" | "g5.2xlarge" | "g5.4xlarge" | "g5.8xlarge" | "g5.16xlarge")[];
    /**
     * <p>The length of time, in minutes, that a streaming session can be active before it is
     * stopped or terminated. After this point, Nimble Studio automatically terminates or
     * stops the session. The default length of time is 690 minutes, and the maximum length of
     * time is 30 days.</p>
     * @default 690
     * @minimum 1
     * @maximum 43200
     */
    MaxSessionLengthInMinutes?: number;
    /**
     * <p>The streaming images that users can select from when launching a streaming session
     * with this launch profile.</p>
     * @minItems 1
     * @maxItems 20
     */
    StreamingImageIds: string[];
    /**
     * <p>Integer that determines if you can start and stop your sessions and how long a session
     * can stay in the <code>STOPPED</code> state. The default value is 0. The maximum value
     * is
     * 5760.</p>
     * <p>This field is allowed only when <code>sessionPersistenceMode</code> is
     * <code>ACTIVATED</code> and <code>automaticTerminationMode</code> is
     * <code>ACTIVATED</code>.</p>
     * <p>If the value is set to 0, your sessions can’t be <code>STOPPED</code>. If you then
     * call <code>StopStreamingSession</code>, the session fails. If the time that a session
     * stays in the <code>READY</code> state exceeds the
     * <code>maxSessionLengthInMinutes</code>
     * value, the session will automatically be terminated (instead of
     * <code>STOPPED</code>).</p>
     * <p>If the value is set to a positive number, the session can be stopped. You can call
     * <code>StopStreamingSession</code> to stop sessions in the <code>READY</code> state.
     * If the time that a session stays in the <code>READY</code> state exceeds the
     * <code>maxSessionLengthInMinutes</code> value, the session will automatically be
     * stopped (instead of terminated).</p>
     * @default 0
     * @minimum 0
     * @maximum 5760
     */
    MaxStoppedSessionLengthInMinutes?: number;
    SessionStorage?: {
      Root?: {
        /**
         * <p>The folder path in Linux workstations where files are uploaded.</p>
         * @minLength 1
         * @maxLength 128
         * @pattern ^(\$HOME|/)[/]?([A-Za-z0-9-_]+/)*([A-Za-z0-9_-]+)$
         */
        Linux?: string;
        /**
         * <p>The folder path in Windows workstations where files are uploaded.</p>
         * @minLength 1
         * @maxLength 128
         * @pattern ^((\%HOMEPATH\%)|[a-zA-Z]:)[\\/](?:[a-zA-Z0-9_-]+[\\/])*[a-zA-Z0-9_-]+$
         */
        Windows?: string;
      };
      /**
       * <p>Allows artists to upload files to their workstations. The only valid option is
       * <code>UPLOAD</code>.</p>
       * @minItems 1
       */
      Mode: "UPLOAD"[];
    };
    SessionBackup?: {
      Mode?: "AUTOMATIC" | "DEACTIVATED";
      /**
       * <p>The maximum number of backups that each streaming session created from this launch
       * profile can have.</p>
       * @default 0
       * @minimum 0
       * @maximum 10
       */
      MaxBackupsToRetain?: number;
    };
    SessionPersistenceMode?: "DEACTIVATED" | "ACTIVATED";
    VolumeConfiguration?: {
      /**
       * <p>The size of the root volume that is attached to the streaming session. The root volume
       * size is measured in GiBs.</p>
       * @default 500
       * @minimum 100
       * @maximum 16000
       */
      Size?: number;
      /**
       * <p>The throughput to provision for the root volume that is attached to the streaming
       * session. The throughput is measured in MiB/s.</p>
       * @default 125
       * @minimum 125
       * @maximum 1000
       */
      Throughput?: number;
      /**
       * <p>The number of I/O operations per second for the root volume that is attached to
       * streaming session.</p>
       * @default 3000
       * @minimum 3000
       * @maximum 16000
       */
      Iops?: number;
    };
    AutomaticTerminationMode?: "DEACTIVATED" | "ACTIVATED";
  };
  /**
   * <p>Unique identifiers for a collection of studio components that can be used with this
   * launch profile.</p>
   * @minItems 1
   * @maxItems 100
   */
  StudioComponentIds: string[];
  /** <p>The studio ID. </p> */
  StudioId: string;
  Tags?: Record<string, string>;
};
