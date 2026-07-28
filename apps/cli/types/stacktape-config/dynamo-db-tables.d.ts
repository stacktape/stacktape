import type { DynamoDbTable } from '@stacktape/config/dynamo-db-tables';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';

declare global {
type StpDynamoTable = DynamoDbTable['properties'] & {
  name: string;
  type: DynamoDbTable['type'];
  configParentResourceType: DynamoDbTable['type'] | NextjsWeb['type'];
  nameChain: string[];
};
type DynamoDBTableReferencableParam = 'name' | 'arn' | 'streamArn';
}
