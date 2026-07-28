type StpKinesisStream = KinesisStream['properties'] & {
  name: string;
  type: KinesisStream['type'];
  configParentResourceType: KinesisStream['type'];
  nameChain: string[];
};
type KinesisStreamReferencableParam = 'arn' | 'name';
