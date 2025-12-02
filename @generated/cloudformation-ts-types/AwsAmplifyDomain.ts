// This file is auto-generated. Do not edit manually.
// Source: aws-amplify-domain.json

/** The AWS::Amplify::Domain resource allows you to connect a custom domain to your app. */
export type AwsAmplifyDomain = {
  /**
   * @minLength 1
   * @maxLength 20
   * @pattern d[a-z0-9]+
   */
  AppId: string;
  /**
   * @maxLength 1000
   * @pattern (?s).*
   */
  Arn?: string;
  /** @uniqueItems false */
  AutoSubDomainCreationPatterns?: string[];
  /**
   * @maxLength 1000
   * @pattern ^$|^arn:.+:iam::\d{12}:role.+
   */
  AutoSubDomainIAMRole?: string;
  /** @maxLength 1000 */
  CertificateRecord?: string;
  Certificate?: {
    /** @enum ["AMPLIFY_MANAGED","CUSTOM"] */
    CertificateType?: "AMPLIFY_MANAGED" | "CUSTOM";
    /** @pattern "^arn:aws:acm:[a-z0-9-]+:\d{12}:certificate\/.+$" */
    CertificateArn?: string;
    /** @maxLength 1000 */
    CertificateVerificationDNSRecord?: string;
  };
  CertificateSettings?: {
    /** @enum ["AMPLIFY_MANAGED","CUSTOM"] */
    CertificateType?: "AMPLIFY_MANAGED" | "CUSTOM";
    /** @pattern ^arn:aws:acm:[a-z0-9-]+:\d{12}:certificate\/.+$ */
    CustomCertificateArn?: string;
  };
  /**
   * @maxLength 255
   * @pattern ^(((?!-)[A-Za-z0-9-]{0,62}[A-Za-z0-9])\.)+((?!-)[A-Za-z0-9-]{1,62}[A-Za-z0-9])(\.)?$
   */
  DomainName: string;
  DomainStatus?: string;
  UpdateStatus?: string;
  EnableAutoSubDomain?: boolean;
  /** @maxLength 1000 */
  StatusReason?: string;
  /**
   * @maxItems 255
   * @uniqueItems false
   */
  SubDomainSettings: {
    /**
     * @maxLength 255
     * @pattern (?s).*
     */
    Prefix: string;
    /**
     * @minLength 1
     * @maxLength 255
     * @pattern (?s).+
     */
    BranchName: string;
  }[];
};
