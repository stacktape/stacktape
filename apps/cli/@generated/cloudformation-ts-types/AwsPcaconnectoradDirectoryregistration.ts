// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorad-directoryregistration.json

/** Definition of AWS::PCAConnectorAD::DirectoryRegistration Resource Type */
export type AwsPcaconnectoradDirectoryregistration = {
  /** @pattern ^d-[0-9a-f]{10}$ */
  DirectoryId: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:[\w-]+:pca-connector-ad:[\w-]+:[0-9]+:directory-registration(\/[\w-]+)$
   */
  DirectoryRegistrationArn?: string;
  Tags?: Record<string, string>;
};
