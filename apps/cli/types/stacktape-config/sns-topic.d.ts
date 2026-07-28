type StpSnsTopic = SnsTopic['properties'] & {
  name: string;
  type: SnsTopic['type'];
  configParentResourceType: SnsTopic['type'];
  nameChain: string[];
};
type SnsTopicReferencableParam = 'arn' | 'name';
