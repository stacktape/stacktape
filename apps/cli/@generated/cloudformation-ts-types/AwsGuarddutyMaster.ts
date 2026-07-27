// This file is auto-generated. Do not edit manually.
// Source: aws-guardduty-master.json

/** GuardDuty Master resource schema */
export type AwsGuarddutyMaster = {
  /** ID of the account used as the master account. */
  MasterId: string;
  /** Value used to validate the master account to the member account. */
  InvitationId?: string;
  /** Unique ID of the detector of the GuardDuty member account. */
  DetectorId: string;
};
