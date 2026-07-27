// This file is auto-generated. Do not edit manually.
// Source: aws-pcaconnectorscep-challenge.json

/** Represents a SCEP Challenge that is used for certificate enrollment */
export type AwsPcaconnectorscepChallenge = {
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:aws(-[a-z]+)*:pca-connector-scep:[a-z]+(-[a-z]+)+-[1-9]\d*:\d{12}:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}\/challenge\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  ChallengeArn?: string;
  /**
   * @minLength 5
   * @maxLength 200
   * @pattern ^arn:aws(-[a-z]+)*:pca-connector-scep:[a-z]+(-[a-z]+)+-[1-9]\d*:\d{12}:connector\/[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$
   */
  ConnectorArn: string;
  Tags?: Record<string, string>;
};
