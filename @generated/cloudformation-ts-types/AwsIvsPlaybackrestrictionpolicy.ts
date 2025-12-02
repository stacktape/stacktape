// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-playbackrestrictionpolicy.json

/** Resource Type definition for AWS::IVS::PlaybackRestrictionPolicy. */
export type AwsIvsPlaybackrestrictionpolicy = {
  /**
   * Playback-restriction-policy identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:playback-restriction-policy/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /**
   * A list of country codes that control geoblocking restriction. Allowed values are the officially
   * assigned ISO 3166-1 alpha-2 codes. Default: All countries (an empty array).
   * @default []
   * @uniqueItems true
   */
  AllowedCountries?: string[];
  /**
   * A list of origin sites that control CORS restriction. Allowed values are the same as valid values
   * of the Origin header defined at https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Origin
   * @default []
   */
  AllowedOrigins?: string[];
  /**
   * Whether channel playback is constrained by origin site.
   * @default false
   */
  EnableStrictOriginEnforcement?: boolean;
  /**
   * Playback-restriction-policy name.
   * @minLength 0
   * @maxLength 128
   * @pattern ^[a-zA-Z0-9-_]*$
   */
  Name?: string;
  /**
   * An array of key-value pairs to apply to this resource.
   * @maxItems 50
   * @uniqueItems true
   */
  Tags?: {
    /**
     * The key name of the tag. You can specify a value that is 1 to 128 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 1
     * @maxLength 128
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that is 0 to 256 Unicode characters in length and
     * cannot be prefixed with aws:. You can use any of the following characters: the set of Unicode
     * letters, digits, whitespace, _, ., /, =, +, and -.
     * @minLength 0
     * @maxLength 256
     */
    Value: string;
  }[];
};
