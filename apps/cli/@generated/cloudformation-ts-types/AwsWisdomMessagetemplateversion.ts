// This file is auto-generated. Do not edit manually.
// Source: aws-wisdom-messagetemplateversion.json

/** A version for the specified customer-managed message template within the specified knowledge base. */
export type AwsWisdomMessagetemplateversion = {
  /**
   * The unqualified Amazon Resource Name (ARN) of the message template.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})?$
   */
  MessageTemplateArn: string;
  /**
   * The unqualified Amazon Resource Name (ARN) of the message template version.
   * @pattern ^arn:[a-z-]*?:wisdom:[a-z0-9-]*?:[0-9]{12}:[a-z-]*?/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}(?:/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}):[0-9]+?$
   */
  MessageTemplateVersionArn?: string;
  /**
   * The content SHA256 of the message template.
   * @minLength 1
   * @maxLength 64
   */
  MessageTemplateContentSha256?: string;
  /** Current version number of the message template. */
  MessageTemplateVersionNumber?: number;
};
