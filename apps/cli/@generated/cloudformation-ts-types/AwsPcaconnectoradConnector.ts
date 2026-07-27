// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorad-connector.json

/** Represents a Connector that connects AWS PrivateCA and your directory */
export type AwsPcaconnectoradConnector = {
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:acm-pca:[\w-]+:[0-9]+:certificate-authority\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  CertificateAuthorityArn: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  ConnectorArn?: string;
  /** @pattern ^d-[0-9a-f]{10}$ */
  DirectoryId: string;
  Tags?: Record<string, string>;
  VpcInformation: {
    /**
     * @minItems 1
     * @maxItems 5
     * @uniqueItems true
     */
    SecurityGroupIds: string[];
    /** @enum ["IPV4","DUALSTACK"] */
    IpAddressType?: "IPV4" | "DUALSTACK";
  };
};
