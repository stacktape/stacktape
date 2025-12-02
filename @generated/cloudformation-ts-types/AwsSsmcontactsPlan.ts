// This file is auto-generated. Do not edit manually.
// Source: aws-ssmcontacts-plan.json

/** Engagement Plan for a SSM Incident Manager Contact. */
export type AwsSsmcontactsPlan = {
  /**
   * Contact ID for the AWS SSM Incident Manager Contact to associate the plan.
   * @pattern arn:[-\w+=\/,.@]+:[-\w+=\/,.@]+:[-\w+=\/,.@]*:[0-9]+:([\w+=\/,.@:-]+)*
   */
  ContactId?: string;
  /** The stages that an escalation plan or engagement plan engages contacts and contact methods in. */
  Stages?: ({
    /** The time to wait until beginning the next stage. */
    DurationInMinutes: number;
    /** The contacts or contact methods that the escalation plan or engagement plan is engaging. */
    Targets?: (unknown | unknown)[];
  })[];
  /** Rotation Ids to associate with Oncall Contact for engagement. */
  RotationIds?: string[];
  /** The Amazon Resource Name (ARN) of the contact. */
  Arn?: string;
};
