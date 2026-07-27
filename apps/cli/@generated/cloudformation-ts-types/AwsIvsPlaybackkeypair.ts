// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-playbackkeypair.json

/** Resource Type definition for AWS::IVS::PlaybackKeyPair */
export type AwsIvsPlaybackkeypair = {
  /**
   * An arbitrary string (a nickname) assigned to a playback key pair that helps the customer identify
   * that resource. The value does not need to be unique.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * The public portion of a customer-generated key pair. This field is required to create the
   * AWS::IVS::PlaybackKeyPair resource.
   */
  PublicKeyMaterial?: string;
  /** Key-pair identifier. */
  Fingerprint?: string;
  /**
   * Key-pair identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:playback-key/[a-zA-Z0-9-]+$
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
