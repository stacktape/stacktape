// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-usersettings.json

/** Definition of AWS::WorkSpacesWeb::UserSettings Resource Type */
export type AwsWorkspaceswebUsersettings = {
  AdditionalEncryptionContext?: Record<string, string>;
  AssociatedPortalArns?: string[];
  CookieSynchronizationConfiguration?: {
    /**
     * @minItems 0
     * @maxItems 10
     */
    Allowlist: {
      /**
       * @minLength 0
       * @maxLength 253
       * @pattern ^(\.?)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
       */
      Domain: string;
      /**
       * @minLength 0
       * @maxLength 4096
       */
      Name?: string;
      /**
       * @minLength 0
       * @maxLength 2000
       * @pattern ^/(\S)*$
       */
      Path?: string;
    }[];
    /**
     * @minItems 0
     * @maxItems 10
     */
    Blocklist?: {
      /**
       * @minLength 0
       * @maxLength 253
       * @pattern ^(\.?)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$
       */
      Domain: string;
      /**
       * @minLength 0
       * @maxLength 4096
       */
      Name?: string;
      /**
       * @minLength 0
       * @maxLength 2000
       * @pattern ^/(\S)*$
       */
      Path?: string;
    }[];
  };
  CopyAllowed: "Disabled" | "Enabled";
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:key\/[a-zA-Z0-9-]+$
   */
  CustomerManagedKey?: string;
  /**
   * @default null
   * @minimum 1
   * @maximum 600
   */
  DisconnectTimeoutInMinutes?: number;
  DownloadAllowed: "Disabled" | "Enabled";
  /**
   * @default null
   * @minimum 0
   * @maximum 60
   */
  IdleDisconnectTimeoutInMinutes?: number;
  PasteAllowed: "Disabled" | "Enabled";
  PrintAllowed: "Disabled" | "Enabled";
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     * @pattern ^([\p{L}\p{Z}\p{N}_.:/=+\-@]*)$
     */
    Value: string;
  }[];
  ToolbarConfiguration?: {
    ToolbarType?: "Floating" | "Docked";
    VisualMode?: "Dark" | "Light";
    HiddenToolbarItems?: ("Windows" | "DualMonitor" | "FullScreen" | "Webcam" | "Microphone")[];
    MaxDisplayResolution?: "size4096X2160" | "size3840X2160" | "size3440X1440" | "size2560X1440" | "size1920X1080" | "size1280X720" | "size1024X768" | "size800X600";
  };
  UploadAllowed: "Disabled" | "Enabled";
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  UserSettingsArn?: string;
  DeepLinkAllowed?: "Disabled" | "Enabled";
};
