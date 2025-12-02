// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-sessionlogger.json

/** Definition of AWS::WorkSpacesWeb::SessionLogger Resource Type */
export type AwsWorkspaceswebSessionlogger = {
  AdditionalEncryptionContext?: Record<string, string>;
  AssociatedPortalArns?: string[];
  CreationDate?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:key\/[a-zA-Z0-9-]+$
   */
  CustomerManagedKey?: string;
  /**
   * @minLength 1
   * @maxLength 64
   * @pattern ^[ _\-\d\w]+$
   */
  DisplayName?: string;
  EventFilter: {
    All: Record<string, unknown>;
  } | {
    /**
     * @minItems 1
     * @maxItems 100
     * @uniqueItems true
     */
    Include: ("WebsiteInteract" | "FileDownloadFromSecureBrowserToRemoteDisk" | "FileTransferFromRemoteToLocalDisk" | "FileTransferFromLocalToRemoteDisk" | "FileUploadFromRemoteDiskToSecureBrowser" | "ContentPasteToWebsite" | "ContentTransferFromLocalToRemoteClipboard" | "ContentCopyFromWebsite" | "UrlLoad" | "TabOpen" | "TabClose" | "PrintJobSubmit" | "SessionConnect" | "SessionStart" | "SessionDisconnect" | "SessionEnd" | "UrlBlockByContentFilter")[];
  };
  LogConfiguration: {
    S3?: {
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^[a-z0-9][\.\-a-z0-9]{1,61}[a-z0-9]$
       */
      Bucket: string;
      /**
       * @minLength 1
       * @maxLength 256
       * @pattern ^[\d\w\-_/!().*']+$
       */
      KeyPrefix?: string;
      /** @pattern ^[0-9]{12}$ */
      BucketOwner?: string;
      LogFileFormat: "JSONLines" | "Json";
      FolderStructure: "Flat" | "NestedByDate";
    };
  };
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  SessionLoggerArn?: string;
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
};
