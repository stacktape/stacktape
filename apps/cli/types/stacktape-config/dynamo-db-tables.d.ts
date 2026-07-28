type StpDynamoTable = DynamoDbTable['properties'] & {
  name: string;
  type: DynamoDbTable['type'];
  configParentResourceType: DynamoDbTable['type'] | NextjsWeb['type'];
  nameChain: string[];
};
type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';
