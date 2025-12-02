// This file is auto-generated. Do not edit manually.
// Source: aws-connectcampaigns-campaign.json

/** Definition of AWS::ConnectCampaigns::Campaign Resource Type */
export type AwsConnectcampaignsCampaign = {
  /**
   * Amazon Connect Instance Arn
   * @minLength 0
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*$
   */
  ConnectInstanceArn: string;
  DialerConfig: unknown | unknown | unknown;
  /**
   * Amazon Connect Campaign Arn
   * @minLength 0
   * @maxLength 256
   * @pattern ^arn:aws[-a-z0-9]*:connect-campaigns:[-a-z0-9]*:[0-9]{12}:campaign/[-a-zA-Z0-9]*$
   */
  Arn?: string;
  /**
   * Amazon Connect Campaign Name
   * @minLength 1
   * @maxLength 127
   */
  Name: string;
  OutboundCallConfig: {
    /**
     * The identifier of the contact flow for the outbound call.
     * @maxLength 500
     * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/contact-flow/[-a-zA-Z0-9]*$
     */
    ConnectContactFlowArn: string;
    /**
     * The phone number associated with the Amazon Connect instance, in E.164 format. If you do not
     * specify a source phone number, you must specify a queue.
     * @maxLength 100
     */
    ConnectSourcePhoneNumber?: string;
    /**
     * The queue for the call. If you specify a queue, the phone displayed for caller ID is the phone
     * number specified in the queue. If you do not specify a queue, the queue defined in the contact flow
     * is used. If you do not specify a queue, you must specify a source phone number.
     * @maxLength 500
     * @pattern ^arn:aws[-a-z0-9]*:connect:[-a-z0-9]*:[0-9]{12}:instance/[-a-zA-Z0-9]*/queue/[-a-zA-Z0-9]*$
     */
    ConnectQueueArn?: string;
    AnswerMachineDetectionConfig?: {
      /** Flag to decided whether outbound calls should have answering machine detection enabled or not */
      EnableAnswerMachineDetection: boolean;
      /** Enables detection of prompts (e.g., beep after after a voicemail greeting) */
      AwaitAnswerMachinePrompt?: boolean;
    };
  };
  /**
   * One or more tags.
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
     * @pattern ^(?!aws:)[a-zA-Z+-=._:/]+$
     */
    Key: string;
    /**
     * The value for the tag. You can specify a value that's 1 to 256 characters in length.
     * @minLength 1
     * @maxLength 256
     */
    Value: string;
  }[];
};
