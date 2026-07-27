// This file is auto-generated. Do not edit manually.
// Source: aws-networkmanager-site.json

/** The AWS::NetworkManager::Site type describes a site. */
export type AwsNetworkmanagerSite = {
  /** The Amazon Resource Name (ARN) of the site. */
  SiteArn?: string;
  /** The ID of the site. */
  SiteId?: string;
  /** The description of the site. */
  Description?: string;
  /**
   * The tags for the site.
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
  /** The ID of the global network. */
  GlobalNetworkId: string;
  /** The location of the site. */
  Location?: {
    /** The physical address. */
    Address?: string;
    /** The latitude. */
    Latitude?: string;
    /** The longitude. */
    Longitude?: string;
  };
  /** The date and time that the device was created. */
  CreatedAt?: string;
  /** The state of the site. */
  State?: string;
};
