import type { StpBucket } from '@domain-services/config-manager/resolved-types/buckets';
import type { StpDynamoTable } from '@domain-services/config-manager/resolved-types/dynamo-db-tables';
import type { StpEdgeLambdaFunction } from '@domain-services/config-manager/resolved-types/edge-lambda-functions';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpSqsQueue } from '@domain-services/config-manager/resolved-types/sqs-queues';
import type { NextjsWeb } from '@stacktape/config/nextjs-web';

export type StpNextjsWeb = NextjsWeb['properties'] & {
  name: string;
  type: NextjsWeb['type'];
  configParentResourceType: NextjsWeb['type'];
  nameChain: string[];
  _nestedResources: {
    bucket: StpBucket;
    serverFunction?: StpLambdaFunction;
    serverEdgeFunction?: StpEdgeLambdaFunction;
    imageFunction: StpLambdaFunction;
    revalidationQueue: StpSqsQueue;
    revalidationFunction: StpLambdaFunction;
    revalidationTable: StpDynamoTable;
    warmerFunction?: StpLambdaFunction;
    revalidationInsertFunction: StpLambdaFunction;
  };
};
