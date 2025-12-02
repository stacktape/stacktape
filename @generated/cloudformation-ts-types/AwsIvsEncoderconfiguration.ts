// This file is auto-generated. Do not edit manually.
// Source: aws-ivs-encoderconfiguration.json

/** Resource Type definition for AWS::IVS::EncoderConfiguration. */
export type AwsIvsEncoderconfiguration = {
  /**
   * Encoder configuration identifier.
   * @minLength 1
   * @maxLength 128
   * @pattern ^arn:aws:ivs:[a-z0-9-]+:[0-9]+:encoder-configuration/[a-zA-Z0-9-]+$
   */
  Arn?: string;
  /** Video configuration. Default: video resolution 1280x720, bitrate 2500 kbps, 30 fps */
  Video?: {
    /**
     * Bitrate for generated output, in bps. Default: 2500000.
     * @default 2500000
     * @minimum 1
     * @maximum 8500000
     */
    Bitrate?: number;
    /**
     * Video frame rate, in fps. Default: 30.
     * @default 30
     * @minimum 1
     * @maximum 60
     */
    Framerate?: number;
    /**
     * Video-resolution height. This must be an even number. Note that the maximum value is determined by
     * width times height, such that the maximum total pixels is 2073600 (1920x1080 or 1080x1920).
     * Default: 720.
     * @default 720
     * @minimum 2
     * @maximum 1920
     */
    Height?: number;
    /**
     * Video-resolution width. This must be an even number. Note that the maximum value is determined by
     * width times height, such that the maximum total pixels is 2073600 (1920x1080 or 1080x1920).
     * Default: 1280.
     * @default 1280
     * @minimum 2
     * @maximum 1920
     */
    Width?: number;
  };
  /**
   * Encoder configuration name.
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
