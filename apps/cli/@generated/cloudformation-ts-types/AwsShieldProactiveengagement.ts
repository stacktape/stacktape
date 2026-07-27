// This file is auto-generated. Do not edit manually.
// Source: aws-shield-proactiveengagement.json

/**
 * Authorizes the Shield Response Team (SRT) to use email and phone to notify contacts about
 * escalations to the SRT and to initiate proactive customer support.
 */
export type AwsShieldProactiveengagement = {
  AccountId?: string;
  /**
   * If `ENABLED`, the Shield Response Team (SRT) will use email and phone to notify contacts about
   * escalations to the SRT and to initiate proactive customer support.
   * If `DISABLED`, the SRT will not proactively notify contacts about escalations or to initiate
   * proactive customer support.
   * @enum ["ENABLED","DISABLED"]
   */
  ProactiveEngagementStatus: "ENABLED" | "DISABLED";
  /**
   * A list of email addresses and phone numbers that the Shield Response Team (SRT) can use to contact
   * you for escalations to the SRT and to initiate proactive customer support.
   * To enable proactive engagement, the contact list must include at least one phone number.
   * @minItems 1
   * @maxItems 10
   */
  EmergencyContactList: {
    /**
     * Additional notes regarding the contact.
     * @minLength 1
     * @maxLength 1024
     * @pattern ^[\w\s\.\-,:/()+@]*$
     */
    ContactNotes?: string;
    /**
     * The email address for the contact.
     * @minLength 1
     * @maxLength 150
     * @pattern ^\S+@\S+\.\S+$
     */
    EmailAddress: string;
    /**
     * The phone number for the contact
     * @minLength 1
     * @maxLength 16
     * @pattern ^\+[1-9]\d{1,14}$
     */
    PhoneNumber?: string;
  }[];
};
