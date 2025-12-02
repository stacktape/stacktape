// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorad-serviceprincipalname.json

/** Definition of AWS::PCAConnectorAD::ServicePrincipalName Resource Type */
export type AwsPcaconnectoradServiceprincipalname = {
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:connector(\/[\w-]+)$
   */
  ConnectorArn?: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:directory-registration(\/[\w-]+)$
   */
  DirectoryRegistrationArn?: string;
};
