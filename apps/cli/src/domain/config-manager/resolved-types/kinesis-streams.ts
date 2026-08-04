import type { KinesisStream } from '@stacktape/config/kinesis-streams';

export type StpKinesisStream = KinesisStream['properties'] & {
  name: string;
  type: KinesisStream['type'];
  configParentResourceType: KinesisStream['type'];
  nameChain: string[];
};
export type KinesisStreamReferencableParam = 'arn' | 'name';
