// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-publickey.json

/** Resource Type definition for AWS::IVS::PublicKey */
export type AwsIvsPublickey = {
  /**
   * Name of the public key to be imported. The value does not need to be unique.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * The public portion of a customer-generated key pair. This field is required to create the
   * AWS::IVS::PublicKey resource.
   * @pattern -----BEGIN PUBLIC KEY-----\r?\n([a-zA-Z0-9+/=\r\n]+)\r?\n-----END PUBLIC KEY-----(\r?\n)?
   */
  PublicKeyMaterial?: string;
  /** Key-pair identifier. */
  Fingerprint?: string;
  /**
   * Key-pair identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:public-key/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * A list of key-value pairs that contain metadata for the asset model.
   * @maxItems 50
   * @uniqueItems true
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
};
