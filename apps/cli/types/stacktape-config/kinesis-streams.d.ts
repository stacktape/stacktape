import type { KinesisStream } from '@stacktape/config/kinesis-streams';

declare global {
type StpKinesisStream = KinesisStream['properties'] & {
  name: string;
  type: KinesisStream['type'];
  configParentResourceType: KinesisStream['type'];
  nameChain: string[];
};
type KinesisStreamReferencableParam = 'arn' | 'name';
}
