// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-queuelimitassociation.json

/** Definition of AWS::Deadline::QueueLimitAssociation Resource Type */
export type AwsDeadlineQueuelimitassociation = {
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  /** @pattern ^limit-[0-9a-f]{32}$ */
  LimitId: string;
  /** @pattern ^queue-[0-9a-f]{32}$ */
  QueueId: string;
};
