// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-link.json

/** The AWS::NetworkManager::Link type describes a link. */
export type AwsNetworkmanagerLink = {
  /** The Amazon Resource Name (ARN) of the link. */
  LinkArn?: string;
  /** The ID of the link. */
  LinkId?: string;
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The ID of the site */
  SiteId: string;
  /** The Bandwidth for the link. */
  Bandwidth: {
    /** Download speed in Mbps. */
    DownloadSpeed?: number;
    /** Upload speed in Mbps. */
    UploadSpeed?: number;
  };
  /** The provider of the link. */
  Provider?: string;
  /** The description of the link. */
  Description?: string;
  /**
   * The tags for the link.
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     */
    Value: string;
  }[];
  /** The type of the link. */
  Type?: string;
  /** The date and time that the device was created. */
  CreatedAt?: string;
  /** The state of the link. */
  State?: string;
};
