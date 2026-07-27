// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-queuefleetassociation.json

/** Definition of AWS::Deadline::QueueFleetAssociation Resource Type */
export type AwsDeadlineQueuefleetassociation = {
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  /** @pattern ^fleet-[0-9a-f]{32}$ */
  FleetId: string;
  /** @pattern ^queue-[0-9a-f]{32}$ */
  QueueId: string;
};
