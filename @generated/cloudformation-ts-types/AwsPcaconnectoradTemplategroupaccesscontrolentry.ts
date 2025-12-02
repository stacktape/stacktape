// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorad-templategroupaccesscontrolentry.json

/** Definition of AWS::PCAConnectorAD::TemplateGroupAccessControlEntry Resource Type */
export type AwsPcaconnectoradTemplategroupaccesscontrolentry = {
  AccessRights: {
    Enroll?: "ALLOW" | "DENY";
    AutoEnroll?: "ALLOW" | "DENY";
  };
  /**
   * @minLength 0
   * @maxLength 256
   * @pattern ^[\x20-\x7E]+$
   */
  GroupDisplayName: string;
  /**
   * @minLength 7
   * @maxLength 256
   * @pattern ^S-[0-9]-([0-9]+-){1,14}[0-9]+$
   */
  GroupSecurityIdentifier?: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:connector(\/[\w-]+)\/template(\/[\w-]+)$
   */
  TemplateArn?: string;
};
