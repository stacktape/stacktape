import type { NextjsWeb } from '@stacktape/config/nextjs-web';

declare global {
type StpNextjsWeb = NextjsWeb['properties'] & {
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
}
