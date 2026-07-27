// This file is auto-generated. Do not edit manually.
// Source: aws-deadline-queueenvironment.json

/** Definition of AWS::Deadline::QueueEnvironment Resource Type */
export type AwsDeadlineQueueenvironment = {
  /** @pattern ^farm-[0-9a-f]{32}$ */
  FarmId: string;
  Name?: string;
  /**
   * @minimum 0
   * @maximum 10000
   */
  Priority: number;
  /** @pattern ^queueenv-[0-9a-f]{32}$ */
  QueueEnvironmentId?: string;
  /** @pattern ^queue-[0-9a-f]{32}$ */
  QueueId: string;
  /**
   * @minLength 1
   * @maxLength 15000
   */
  Template: string;
  TemplateType: "JSON" | "YAML";
};
