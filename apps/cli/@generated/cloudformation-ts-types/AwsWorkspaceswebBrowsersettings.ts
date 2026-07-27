// This file is auto-generated. Do not edit manually.
// Source: aws-workspacesweb-browsersettings.json

/** Definition of AWS::WorkSpacesWeb::BrowserSettings Resource Type */
export type AwsWorkspaceswebBrowsersettings = {
  AdditionalEncryptionContext?: Record<string, string>;
  AssociatedPortalArns?: string[];
  /**
   * @minLength 2
   * @maxLength 131072
   * @pattern ^\{[\S\s]*\}\s*$
   */
  BrowserPolicy?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:[a-zA-Z0-9\-]+:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:[a-zA-Z]+(\/[a-fA-F0-9\-]{36})+$
   */
  BrowserSettingsArn?: string;
  /**
   * @minLength 20
   * @maxLength 2048
   * @pattern ^arn:[\w+=\/,.@-]+:kms:[a-zA-Z0-9\-]*:[a-zA-Z0-9]{1,12}:key\/[a-zA-Z0-9-]+$
   */
  CustomerManagedKey?: string;
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
  WebContentFilteringPolicy?: {
    /**
     * @minItems 1
     * @maxItems 100
     * @uniqueItems true
     */
    BlockedCategories?: ("Cults" | "Gambling" | "Nudity" | "Pornography" | "SexEducation" | "Tasteless" | "Violence" | "DownloadSites" | "ImageSharing" | "PeerToPeer" | "StreamingMediaAndDownloads" | "GenerativeAI" | "CriminalActivity" | "Hacking" | "HateAndIntolerance" | "IllegalDrug" | "IllegalSoftware" | "SchoolCheating" | "SelfHarm" | "Weapons" | "Chat" | "Games" | "InstantMessaging" | "ProfessionalNetwork" | "SocialNetworking" | "WebBasedEmail" | "ParkedDomains")[];
    /**
     * @minItems 1
     * @maxItems 1000
     */
    AllowedUrls?: string[];
    /**
     * @minItems 1
     * @maxItems 1000
     */
    BlockedUrls?: string[];
  };
};
