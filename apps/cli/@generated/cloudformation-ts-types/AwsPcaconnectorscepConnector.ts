// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorscep-connector.json

/**
 * Represents a Connector that allows certificate issuance through Simple Certificate Enrollment
 * Protocol (SCEP)
 */
export type AwsPcaconnectorscepConnector = {
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:aws(-[a-z]+)*:acm-pca:[a-z]+(-[a-z]+)+-[1-9]\d*:\d{12}:certificate-authority\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  CertificateAuthorityArn: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:aws(-[a-z]+)*:pca-connector-scep:[a-z]+(-[a-z]+)+-[1-9]\d*:\d{12}:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  ConnectorArn?: string;
  Type?: "GENERAL_PURPOSE" | "INTUNE";
  /**
   * @minLength 5
   * @maxLength 200
   */
  Endpoint?: string;
  MobileDeviceManagement?: unknown;
  OpenIdConfiguration?: {
    Issuer?: string;
    Subject?: string;
    Audience?: string;
  };
  Tags?: Record<string, string>;
};
