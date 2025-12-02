// This file is auto-generated. Do not edit manually.
// Source: aws-rolesanywhere-trustanchor.json

/** Definition of AWS::RolesAnywhere::TrustAnchor Resource Type. */
export type AwsRolesanywhereTrustanchor = {
  Enabled?: boolean;
  Name: string;
  /**
   * @minItems 0
   * @maxItems 50
   */
  NotificationSettings?: ({
    Enabled: boolean;
    Event: "CA_CERTIFICATE_EXPIRY" | "END_ENTITY_CERTIFICATE_EXPIRY";
    /**
     * @minimum 1
     * @maximum 360
     */
    Threshold?: number;
    Channel?: "ALL";
  })[];
  Source: {
    SourceType: "AWS_ACM_PCA" | "CERTIFICATE_BUNDLE";
    SourceData: {
      X509CertificateData: string;
    } | {
      AcmPcaArn: string;
    };
  };
  /**
   * @minItems 0
   * @maxItems 200
   */
  Tags?: {
    /**
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
  /** @pattern [a-f0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12} */
  TrustAnchorId?: string;
  /** @pattern [a-f0-9]{8}-([a-z0-9]{4}-){3}[a-z0-9]{12} */
  TrustAnchorArn?: string;
};
