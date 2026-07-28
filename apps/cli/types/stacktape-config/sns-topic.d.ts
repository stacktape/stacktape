import type { SnsTopic } from '@stacktape/config/sns-topic';

declare global {
type StpSnsTopic = SnsTopic['properties'] & {
  name: string;
  type: SnsTopic['type'];
  configParentResourceType: SnsTopic['type'];
  nameChain: string[];
};
type SnsTopicReferencableParam = 'arn' | 'name';
}
