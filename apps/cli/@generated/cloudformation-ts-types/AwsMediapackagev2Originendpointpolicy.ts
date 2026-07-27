// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackagev2-originendpointpolicy.json

/** <p>Represents a resource policy that allows or denies access to an origin endpoint.</p> */
export type AwsMediapackagev2Originendpointpolicy = {
  CdnAuthConfiguration?: {
    /**
     * @minItems 1
     * @maxItems 100
     */
    CdnIdentifierSecretArns: string[];
    /**
     * @minLength 20
     * @maxLength 2048
     */
    SecretsRoleArn: string;
  };
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ChannelGroupName: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ChannelName: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  OriginEndpointName: string;
  Policy: Record<string, unknown> | string;
};
