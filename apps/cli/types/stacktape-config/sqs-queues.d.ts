type StpSqsQueue = SqsQueue['properties'] & {
  name: string;
  type: SqsQueue['type'];
  configParentResourceType: SqsQueue['type'] | NextjsWeb['type'];
  nameChain: string[];
};
type SqsQueueReferencableParam = 'arn' | 'name' | 'url';
