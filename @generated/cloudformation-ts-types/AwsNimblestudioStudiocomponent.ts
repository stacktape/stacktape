// This file is auto-generated. Do not edit manually.
// Source: aws-nimblestudio-studiocomponent.json

/**
 * Represents a studio component that connects a non-Nimble Studio resource in your account to your
 * studio
 */
export type AwsNimblestudioStudiocomponent = {
  Configuration?: {
    ActiveDirectoryConfiguration: {
      /**
       * <p>A collection of custom attributes for an Active Directory computer.</p>
       * @minItems 0
       * @maxItems 50
       */
      ComputerAttributes?: {
        /**
         * <p>The name for the LDAP attribute.</p>
         * @minLength 1
         * @maxLength 40
         */
        Name?: string;
        /**
         * <p>The value for the LDAP attribute.</p>
         * @minLength 1
         * @maxLength 64
         */
        Value?: string;
      }[];
      /**
       * <p>The directory ID of the Directory Service for Microsoft Active Directory to access
       * using this studio component.</p>
       */
      DirectoryId?: string;
      /**
       * <p>The distinguished name (DN) and organizational unit (OU) of an Active Directory
       * computer.</p>
       * @minLength 1
       * @maxLength 2000
       */
      OrganizationalUnitDistinguishedName?: string;
    };
  } | {
    ComputeFarmConfiguration: {
      /**
       * <p>The name of an Active Directory user that is used on ComputeFarm worker
       * instances.</p>
       */
      ActiveDirectoryUser?: string;
      /**
       * <p>The endpoint of the ComputeFarm that is accessed by the studio component
       * resource.</p>
       */
      Endpoint?: string;
    };
  } | {
    LicenseServiceConfiguration: {
      /**
       * <p>The endpoint of the license service that is accessed by the studio component
       * resource.</p>
       */
      Endpoint?: string;
    };
  } | {
    SharedFileSystemConfiguration: {
      /**
       * <p>The endpoint of the shared file system that is accessed by the studio component
       * resource.</p>
       */
      Endpoint?: string;
      /** <p>The unique identifier for a file system.</p> */
      FileSystemId?: string;
      /**
       * <p>The mount location for a shared file system on a Linux virtual workstation.</p>
       * @minLength 0
       * @maxLength 128
       * @pattern ^(/?|(\$HOME)?(/[^/\n\s\\]+)*)$
       */
      LinuxMountPoint?: string;
      /** <p>The name of the file share.</p> */
      ShareName?: string;
      /**
       * <p>The mount location for a shared file system on a Windows virtual workstation.</p>
       * @pattern ^[A-Z]$
       */
      WindowsMountDrive?: string;
    };
  };
  /**
   * <p>The description.</p>
   * @minLength 0
   * @maxLength 256
   */
  Description?: string;
  /**
   * <p>The EC2 security groups that control access to the studio component.</p>
   * @minItems 0
   * @maxItems 30
   */
  Ec2SecurityGroupIds?: string[];
  /** <p>Initialization scripts for studio components.</p> */
  InitializationScripts?: ({
    /**
     * <p>The version number of the protocol that is used by the launch profile. The only valid
     * version is "2021-03-31".</p>
     * @minLength 0
     * @maxLength 10
     * @pattern ^2021\-03\-31$
     */
    LaunchProfileProtocolVersion?: string;
    Platform?: "LINUX" | "WINDOWS";
    RunContext?: "SYSTEM_INITIALIZATION" | "USER_INITIALIZATION";
    /**
     * <p>The initialization script.</p>
     * @minLength 1
     * @maxLength 5120
     */
    Script?: string;
  })[];
  /**
   * <p>The name for the studio component.</p>
   * @minLength 0
   * @maxLength 64
   */
  Name: string;
  /**
   * @minLength 0
   * @maxLength 2048
   */
  RuntimeRoleArn?: string;
  /**
   * <p>Parameters for the studio component scripts.</p>
   * @minItems 0
   * @maxItems 30
   */
  ScriptParameters?: {
    /**
     * <p>A script parameter key.</p>
     * @minLength 1
     * @maxLength 64
     * @pattern ^[a-zA-Z_][a-zA-Z0-9_]+$
     */
    Key?: string;
    /**
     * <p>A script parameter value.</p>
     * @minLength 1
     * @maxLength 256
     */
    Value?: string;
  }[];
  /**
   * @minLength 0
   * @maxLength 2048
   */
  SecureInitializationRoleArn?: string;
  StudioComponentId?: string;
  /** <p>The studio ID. </p> */
  StudioId: string;
  Subtype?: "AWS_MANAGED_MICROSOFT_AD" | "AMAZON_FSX_FOR_WINDOWS" | "AMAZON_FSX_FOR_LUSTRE" | "CUSTOM";
  Tags?: Record<string, string>;
  Type: "ACTIVE_DIRECTORY" | "SHARED_FILE_SYSTEM" | "COMPUTE_FARM" | "LICENSE_SERVICE" | "CUSTOM";
};
