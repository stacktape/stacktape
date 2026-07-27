// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackagev2-channelgroup.json

/** <p>Represents a channel group that facilitates the grouping of multiple channels.</p> */
export type AwsMediapackagev2Channelgroup = {
  /** <p>The Amazon Resource Name (ARN) associated with the resource.</p> */
  Arn?: string;
  /**
   * @minLength 1
   * @maxLength 256
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  ChannelGroupName: string;
  /** <p>The date and time the channel group was created.</p> */
  CreatedAt?: string;
  /**
   * <p>Enter any descriptive text that helps you to identify the channel group.</p>
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /**
   * <p>The output domain where the source stream should be sent. Integrate the domain with a downstream
   * CDN (such as Amazon CloudFront) or playback device.</p>
   */
  EgressDomain?: string;
  /** <p>The date and time the channel group was modified.</p> */
  ModifiedAt?: string;
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
