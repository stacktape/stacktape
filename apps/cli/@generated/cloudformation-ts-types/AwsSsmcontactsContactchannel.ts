// This file is auto-generated. Do not edit manually.
// Source: aws-ssmcontacts-contactchannel.json

/** Resource Type definition for AWS::SSMContacts::ContactChannel */
export type AwsSsmcontactsContactchannel = {
  /**
   * ARN of the contact resource
   * @minLength 1
   * @maxLength 2048
   * @pattern arn:[-\w+=\/,.@]+:[-\w+=\/,.@]+:[-\w+=\/,.@]*:[0-9]+:([\w+=\/,.@:-]+)*
   */
  ContactId?: string;
  /**
   * The device name. String of 6 to 50 alphabetical, numeric, dash, and underscore characters.
   * @minLength 1
   * @maxLength 255
   * @pattern [a-zA-Z 0-9_\-+'&amp;\uD83C-\uDBFF\uDC00-\uDFFF\u2000-\u3300]+
   */
  ChannelName?: string;
  /**
   * Device type, which specify notification channel. Currently supported values: “SMS”, “VOICE”,
   * “EMAIL”, “CHATBOT.
   * @enum ["SMS","VOICE","EMAIL"]
   */
  ChannelType?: "SMS" | "VOICE" | "EMAIL";
  /**
   * If you want to activate the channel at a later time, you can choose to defer activation. SSM
   * Incident Manager can't engage your contact channel until it has been activated.
   */
  DeferActivation?: boolean;
  /** The details that SSM Incident Manager uses when trying to engage the contact channel. */
  ChannelAddress?: string;
  /** The Amazon Resource Name (ARN) of the engagement to a contact channel. */
  Arn?: string;
};
