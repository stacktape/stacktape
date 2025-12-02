// This file is auto-generated. Do not edit manually.
// Source: aws-mediapackagev2-channel.json

/**
 * <p>Represents an entry point into AWS Elemental MediaPackage for an ABR video content stream sent
 * from an upstream encoder such as AWS Elemental MediaLive. The channel continuously analyzes the
 * content that it receives and prepares it to be distributed to consumers via one or more origin
 * endpoints.</p>
 */
export type AwsMediapackagev2Channel = {
  /** <p>The Amazon Resource Name (ARN) associated with the resource.</p> */
  Arn?: string;
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
  /** <p>The date and time the channel was created.</p> */
  CreatedAt?: string;
  /**
   * <p>Enter any descriptive text that helps you to identify the channel.</p>
   * @minLength 0
   * @maxLength 1024
   */
  Description?: string;
  /** <p>The list of ingest endpoints.</p> */
  IngestEndpoints?: {
    /** <p>The system-generated unique identifier for the IngestEndpoint.</p> */
    Id?: string;
    /** <p>The ingest domain URL where the source stream should be sent.</p> */
    Url?: string;
  }[];
  InputSwitchConfiguration?: {
    /**
     * <p>When true, AWS Elemental MediaPackage performs input switching based on the MQCS. Default is
     * true. This setting is valid only when <code>InputType</code> is <code>CMAF</code>.</p>
     */
    MQCSInputSwitching?: boolean;
    /**
     * @minimum 1
     * @maximum 2
     */
    PreferredInput?: number;
  };
  InputType?: "HLS" | "CMAF";
  /** <p>The date and time the channel was modified.</p> */
  ModifiedAt?: string;
  OutputHeaderConfiguration?: {
    /**
     * <p>When true, AWS Elemental MediaPackage includes the MQCS in responses to the CDN. This setting is
     * valid only when <code>InputType</code> is <code>CMAF</code>.</p>
     */
    PublishMQCS?: boolean;
  };
  IngestEndpointUrls?: string[];
  Tags?: {
    Key?: string;
    Value?: string;
  }[];
};
