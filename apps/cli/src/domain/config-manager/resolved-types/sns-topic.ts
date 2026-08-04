import type { SnsTopic } from '@stacktape/config/sns-topic';

export type StpSnsTopic = SnsTopic['properties'] & {
  name: string;
  type: SnsTopic['type'];
  configParentResourceType: SnsTopic['type'];
  nameChain: string[];
};
export type SnsTopicReferencableParam = 'arn' | 'name';
