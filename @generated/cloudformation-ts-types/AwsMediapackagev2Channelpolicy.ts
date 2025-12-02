// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackagev2-channelpolicy.json

/** <p>Represents a resource-based policy that allows or denies access to a channel.</p> */
export type AwsMediapackagev2Channelpolicy = {
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
  Policy: Record<string, unknown> | string;
};
