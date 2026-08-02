import { describe, expect, test } from 'bun:test';
import { ConfigManager } from '@domain-services/config-manager';
import type { StackContext } from '@domain-services/stack-context';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { fsPaths } from 'src/config/runtime-paths';
import type { StacktapeConfig } from '@stacktape/config';

/**
 * Next.js is the one framework Stacktape does not render as a single server Lambda in front of a bucket. OpenNext
 * splits the build into a server bundle, an image optimizer, a revalidation consumer and a DynamoDB seeder, and the
 * resource may additionally run its server at the edge or keep warm instances — nine children in total, of which three
 * are conditional.
 *
 * These tests state the contracts that materialization owns: what a deployed stack is named, which artifact each
 * child is packaged from, what reaches CloudFormation as an intrinsic, and how CloudFront is told to route. They are
 * deliberately literal about those values, because none of them can change without changing a customer's stack.
 */

const materializationStackContext: StackContext = {
  accountId: '123456789999',
  command: 'synth',
  globallyUniqueStackHash: 'xxxxxxxx',
  invocationId: 'materialization-invocation',
  projectName: 'materialization',
  region: 'eu-west-1',
  stackName: 'materialization-test',
  stage: 'test',
  workingDir: process.cwd()
};

const managerFor = (resources: StacktapeConfig['resources']) => {
  const manager = new ConfigManager();
  manager.setStackContext(materializationStackContext);
  manager.config = { resources };
  return manager;
};

describe('Next.js web materialization', () => {
  // Authored properties are passed loosely on purpose: some of these tests state what materialization does with a
  // value the schema would not accept, such as a zero memory or retention.
  const nextjsWebFor = (properties: Record<string, unknown> = { appDirectory: './' }) =>
    managerFor({ site: { type: 'nextjs-web', properties } } as unknown as StacktapeConfig['resources']).nextjsWebs[0];

  const childrenOf = (properties?: Record<string, unknown>) => nextjsWebFor(properties)._nestedResources;

  /** Intrinsic functions are class instances until CloudFormation emission, so compare them as the JSON they become. */
  const asCloudformationValue = (value: unknown) => JSON.parse(JSON.stringify(value));

  /** Throws rather than narrowing: a conditional child has to be requested from a configuration that synthesizes it. */
  const requireChild = <TChild>(child: TChild | undefined, description: string): TChild => {
    if (!child) {
      throw new Error(`Expected this configuration to synthesize ${description}, but it was absent.`);
    }
    return child;
  };

  /** The configuration that materializes the most children: a Lambda-served site that also keeps warm instances. */
  const allLambdaServedChildren = (properties: Record<string, unknown> = {}) =>
    childrenOf({ appDirectory: './', warmServerInstances: 1, ...properties });

  const serverFunctionOf = (properties?: Record<string, unknown>) =>
    requireChild(childrenOf(properties).serverFunction, 'a server function');

  const serverEdgeFunctionOf = (properties: Record<string, unknown> = {}) =>
    requireChild(
      childrenOf({ appDirectory: './', useEdgeLambda: true, ...properties }).serverEdgeFunction,
      'a server edge function'
    );

  const serverCdnOf = (properties?: Record<string, unknown>) =>
    requireChild(serverFunctionOf(properties).cdn, 'a CDN in front of its server function');

  const routeRewritesOf = (properties?: Record<string, unknown>) =>
    requireChild(serverCdnOf(properties).routeRewrites, 'CDN route rewrites');

  const openNextBuildPath = fsPaths.absoluteNextjsBuiltProjectFolderPath({
    invocationId: materializationStackContext.invocationId,
    stpResourceName: 'site'
  });

  const hostHeaderRewriteFunctionArn = {
    'Fn::GetAtt': [cfLogicalNames.openNextHostHeaderRewriteFunction('site'), 'FunctionARN']
  };

  test('synthesizes nine children, in a fixed order, whether or not each one is materialized', () => {
    // The keys are always present — whether the server runs at the edge, or a warmer is wanted, decides which children
    // are built, not which slots exist. Order is asserted as authored because it survives into every consumer that
    // iterates the record.
    expect(Object.keys(childrenOf())).toEqual([
      'bucket',
      'serverFunction',
      'serverEdgeFunction',
      'imageFunction',
      'revalidationFunction',
      'revalidationQueue',
      'revalidationTable',
      'revalidationInsertFunction',
      'warmerFunction'
    ]);
  });

  test('names every child deterministically from the parent identity', () => {
    const children = allLambdaServedChildren();

    // Each child is named after the parent and the identifier it is filed under; the Stacktape name is what every
    // physical and logical name is then derived from, so this table is what keeps a deployed stack in place.
    expect(
      (
        [
          ['bucket', 'bucket', 'siteBucket'],
          ['serverFunction', 'function', 'siteServerFunction'],
          ['imageFunction', 'function', 'siteImageFunction'],
          ['revalidationFunction', 'function', 'siteRevalidationFunction'],
          ['revalidationQueue', 'sqs-queue', 'siteRevalidationQueue'],
          ['revalidationTable', 'dynamo-db-table', 'siteRevalidationTable'],
          ['revalidationInsertFunction', 'function', 'siteRevalidationInsertFunction'],
          ['warmerFunction', 'function', 'siteWarmerFunction']
        ] as const
      ).map(([key]) => {
        const child = requireChild(children[key], `the ${key} child`);
        return [key, child.type, child.name, child.nameChain, child.configParentResourceType];
      })
    ).toEqual([
      ['bucket', 'bucket', 'siteBucket', ['site', 'bucket'], 'nextjs-web'],
      ['serverFunction', 'function', 'siteServerFunction', ['site', 'serverFunction'], 'nextjs-web'],
      ['imageFunction', 'function', 'siteImageFunction', ['site', 'imageFunction'], 'nextjs-web'],
      ['revalidationFunction', 'function', 'siteRevalidationFunction', ['site', 'revalidationFunction'], 'nextjs-web'],
      ['revalidationQueue', 'sqs-queue', 'siteRevalidationQueue', ['site', 'revalidationQueue'], 'nextjs-web'],
      ['revalidationTable', 'dynamo-db-table', 'siteRevalidationTable', ['site', 'revalidationTable'], 'nextjs-web'],
      [
        'revalidationInsertFunction',
        'function',
        'siteRevalidationInsertFunction',
        ['site', 'revalidationInsertFunction'],
        'nextjs-web'
      ],
      ['warmerFunction', 'function', 'siteWarmerFunction', ['site', 'warmerFunction'], 'nextjs-web']
    ]);

    const edgeServer = serverEdgeFunctionOf();
    expect([edgeServer.type, edgeServer.name, edgeServer.nameChain, edgeServer.configParentResourceType]).toEqual([
      'edge-lambda-function',
      'siteServerEdgeFunction',
      ['site', 'serverEdgeFunction'],
      'nextjs-web'
    ]);
  });

  test('derives every deployed and logical Lambda name from the nested identity', () => {
    const { stackName, region } = materializationStackContext;
    const children = allLambdaServedChildren();

    (
      [
        ['serverFunction', 'siteServerFunction'],
        ['imageFunction', 'siteImageFunction'],
        ['revalidationFunction', 'siteRevalidationFunction'],
        ['revalidationInsertFunction', 'siteRevalidationInsertFunction'],
        ['warmerFunction', 'siteWarmerFunction']
      ] as const
    ).forEach(([key, stpResourceName]) => {
      const lambda = requireChild(children[key], `the ${key} Lambda`);

      expect(lambda.artifactName).toBe(stpResourceName);
      expect(lambda.cfLogicalName).toBe(cfLogicalNames.lambda(stpResourceName));
      expect(lambda.resourceName).toBe(awsResourceNames.lambda(stpResourceName, stackName));
    });

    // The edge server is a replicated function, so its physical name carries the region.
    const edgeServer = serverEdgeFunctionOf();
    expect(edgeServer.artifactName).toBe('siteServerEdgeFunction');
    expect(edgeServer.resourceName).toBe(awsResourceNames.edgeLambda('siteServerEdgeFunction', stackName, region));
  });

  test('packages each child from its own folder under the one OpenNext build path', () => {
    const children = allLambdaServedChildren();

    // Every child is a prebuilt artifact exposing OpenNext's own `index.mjs:handler`; `index-wrap` is Stacktape's
    // wrapper around it, and is the entrypoint only where Stacktape needs to run code of its own first.
    expect(openNextBuildPath.endsWith('/nextjs/site')).toBe(true);
    expect(
      (
        [
          'serverFunction',
          'imageFunction',
          'revalidationFunction',
          'revalidationInsertFunction',
          'warmerFunction'
        ] as const
      ).map((key) => {
        const lambda = requireChild(children[key], `the ${key} Lambda`);
        const packaging = asCloudformationValue(lambda.packaging);
        return [key, packaging.type, packaging.properties.packagePath, packaging.properties.handler, lambda.handler];
      })
    ).toEqual([
      [
        'serverFunction',
        'custom-artifact',
        `${openNextBuildPath}/server-function`,
        'index.mjs:handler',
        'index-wrap.handler'
      ],
      [
        'imageFunction',
        'custom-artifact',
        `${openNextBuildPath}/image-optimization-function`,
        'index.mjs:handler',
        'index.handler'
      ],
      [
        'revalidationFunction',
        'custom-artifact',
        `${openNextBuildPath}/revalidation-function`,
        'index.mjs:handler',
        'index.handler'
      ],
      [
        'revalidationInsertFunction',
        'custom-artifact',
        `${openNextBuildPath}/dynamodb-provider`,
        'index.mjs:handler',
        'index-wrap.handler'
      ],
      [
        'warmerFunction',
        'custom-artifact',
        `${openNextBuildPath}/warmer-function`,
        'index.mjs:handler',
        'index.handler'
      ]
    ]);

    // The edge server is packaged from the same bundle as the regular server.
    const edgeServer = serverEdgeFunctionOf();
    expect(asCloudformationValue(edgeServer.packaging)).toEqual({
      type: 'custom-artifact',
      properties: { packagePath: `${openNextBuildPath}/server-function`, handler: 'index.mjs:handler' }
    });
    expect(edgeServer.handler).toBe('index-wrap.handler');
  });

  test('sizes each child for the job it does', () => {
    const children = allLambdaServedChildren();
    const sizingOf = (lambda: {
      runtime?: string;
      memory?: number;
      timeout?: number;
      logging?: { retentionDays?: number };
    }) => [lambda.runtime, lambda.memory, lambda.timeout, lambda.logging?.retentionDays];

    // The warmer declares no timeout at all, and the three bookkeeping Lambdas keep only three days of logs.
    expect(
      (
        [
          'serverFunction',
          'imageFunction',
          'revalidationFunction',
          'revalidationInsertFunction',
          'warmerFunction'
        ] as const
      ).map((key) => [key, ...sizingOf(requireChild(children[key], `the ${key} Lambda`))])
    ).toEqual([
      ['serverFunction', 'nodejs22.x', 1024, 30, 180],
      ['imageFunction', 'nodejs22.x', 2048, 30, 180],
      ['revalidationFunction', 'nodejs22.x', 128, 30, 3],
      ['revalidationInsertFunction', 'nodejs22.x', 1024, 900, 3],
      ['warmerFunction', 'nodejs22.x', 1024, undefined, 3]
    ]);
    expect(sizingOf(serverEdgeFunctionOf())).toEqual(['nodejs22.x', 1024, 30, 180]);
  });

  test('lets an authored serverLambda block resize the server, treating a zero as unset', () => {
    const logForwarding = { type: 'http-endpoint', properties: { endpointUrl: 'https://logs.example.com' } } as const;
    const serverLambda = {
      memory: 3008,
      timeout: 60,
      joinDefaultVpc: true,
      logging: { disabled: true, logForwarding, retentionDays: 7 }
    };
    const children = allLambdaServedChildren({ serverLambda });
    const serverFunction = requireChild(children.serverFunction, 'a server function');

    expect([serverFunction.memory, serverFunction.timeout, serverFunction.joinDefaultVpc]).toEqual([3008, 60, true]);
    // Sizing belongs to the server alone: the helper Lambdas keep their own numbers.
    expect([children.imageFunction.memory, children.revalidationFunction.memory]).toEqual([2048, 128]);
    // Logging, unlike sizing, is read off `serverLambda` by every child — including the ones it does not size.
    Object.values(children).forEach((child) => {
      if (child && 'logging' in child && child.logging) {
        expect(child.logging.disabled).toBe(true);
        expect(child.logging.logForwarding).toEqual(logForwarding);
        expect(child.logging.retentionDays).toBe(7);
      }
    });

    // The defaults are applied with `||` rather than `??`, so a zero falls back instead of reaching CloudFormation.
    const zeroed = allLambdaServedChildren({ serverLambda: { memory: 0, timeout: 0, logging: { retentionDays: 0 } } });
    const zeroedServer = requireChild(zeroed.serverFunction, 'a server function');

    expect([zeroedServer.memory, zeroedServer.timeout, zeroedServer.logging?.retentionDays]).toEqual([1024, 30, 180]);
    expect(zeroed.revalidationFunction.logging?.retentionDays).toBe(3);
  });

  test('wires each child to the infrastructure it reads and writes', () => {
    const children = childrenOf({ appDirectory: './', environment: [{ name: 'STAGE', value: 'test' }] });

    // The authored environment stays first, then the six handles the server needs for its cache. Every reference is a
    // CloudFormation intrinsic, so the child resolves to the physical name the stack actually deployed.
    expect(asCloudformationValue(requireChild(children.serverFunction, 'a server function').environment)).toEqual([
      { name: 'STAGE', value: 'test' },
      { name: 'CACHE_BUCKET_NAME', value: { Ref: cfLogicalNames.bucket('siteBucket') } },
      { name: 'CACHE_BUCKET_PREFIX', value: '_cache' },
      { name: 'CACHE_BUCKET_REGION', value: materializationStackContext.region },
      { name: 'REVALIDATION_QUEUE_URL', value: { Ref: cfLogicalNames.sqsQueue('siteRevalidationQueue') } },
      { name: 'REVALIDATION_QUEUE_REGION', value: materializationStackContext.region },
      { name: 'CACHE_DYNAMO_TABLE', value: { Ref: cfLogicalNames.dynamoGlobalTable('siteRevalidationTable') } }
    ]);

    // The helpers get only their own handles, and never the authored environment.
    expect(asCloudformationValue(children.imageFunction.environment)).toEqual([
      { name: 'BUCKET_NAME', value: { Ref: cfLogicalNames.bucket('siteBucket') } },
      { name: 'BUCKET_KEY_PREFIX', value: '_assets' }
    ]);
    expect(asCloudformationValue(children.revalidationInsertFunction.environment)).toEqual([
      { name: 'CACHE_DYNAMO_TABLE', value: { Ref: cfLogicalNames.dynamoGlobalTable('siteRevalidationTable') } }
    ]);
    expect(children.revalidationFunction.environment).toBeUndefined();
  });

  test('connects each child to the children it actually talks to', () => {
    const children = allLambdaServedChildren({ connectTo: ['orders'] });
    const cacheConnections = ['site.bucket', 'site.revalidationQueue', 'site.revalidationTable'];

    // The authored connections stay first, then the three the server needs for its cache.
    expect(requireChild(children.serverFunction, 'a server function').connectTo).toEqual([
      'orders',
      ...cacheConnections
    ]);
    expect(serverEdgeFunctionOf({ connectTo: ['orders'] }).connectTo).toEqual(['orders', ...cacheConnections]);
    // The helpers get only their own dependency, and never the authored connections.
    expect(children.imageFunction.connectTo).toEqual(['site.bucket']);
    expect(children.revalidationInsertFunction.connectTo).toEqual(['site.revalidationTable']);
    expect(requireChild(children.warmerFunction, 'a warmer function').connectTo).toEqual(['site.serverFunction']);
    expect(children.revalidationFunction.connectTo).toBeUndefined();
  });

  test('attaches log permissions to the edge server only, behind the authored statements', () => {
    const iamRoleStatements = [{ Effect: 'Allow', Action: ['ses:SendEmail'], Resource: ['*'] }];

    // A regular Lambda gets its log permissions from the role the stack resolver builds for it.
    expect(serverFunctionOf({ appDirectory: './', iamRoleStatements }).iamRoleStatements).toEqual(iamRoleStatements);

    // A replicated edge function cannot, so the statements are attached here instead.
    const edgeStatements = serverEdgeFunctionOf({ iamRoleStatements }).iamRoleStatements;
    const edgeLogGroup = `/aws/lambda/us-east-1.${awsResourceNames.edgeLambda(
      'siteServerEdgeFunction',
      materializationStackContext.stackName,
      materializationStackContext.region
    )}`;

    expect(edgeStatements).toHaveLength(2);
    expect(edgeStatements?.[0]).toEqual(iamRoleStatements[0]);
    expect(asCloudformationValue(edgeStatements?.[1])).toEqual({
      Effect: 'Allow',
      // Log-group creation is deliberately absent: CloudFront creates the replicated log groups itself.
      Action: ['logs:PutLogEvents', 'logs:DescribeLogGroups', 'logs:DescribeLogStreams', 'logs:CreateLogStream'],
      Resource: [
        { 'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${edgeLogGroup}` },
        { 'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${edgeLogGroup}:*` },
        { 'Fn::Sub': `arn:\${AWS::Partition}:logs:*:\${AWS::AccountId}:log-group:${edgeLogGroup}:*:*` }
      ]
    });
  });

  test('puts an enabled CDN in front of the server, keyed on the headers Next.js routes on', () => {
    const cdn = serverCdnOf();

    expect(cdn.enabled).toBe(true);
    expect(asCloudformationValue(cdn.edgeFunctions?.onRequest)).toEqual(hostHeaderRewriteFunctionArn);
    expect(cdn.forwardingOptions).toEqual({
      allowedMethods: ['GET', 'HEAD', 'POST', 'OPTIONS', 'PATCH', 'PUT', 'DELETE'],
      originRequestPolicyId: 'b689b0a8-53d0-40ab-baf2-68738e2966ac'
    });
    // The header whitelist is what separates this from the single-Lambda SSR frameworks: an RSC request and a document
    // request for the same URL must not share a cache entry.
    expect(cdn.cachingOptions).toEqual({
      cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
      defaultTTL: 0,
      minTTL: 0,
      maxTTL: 31536000,
      cacheKeyParameters: {
        headers: { whitelist: ['next-url', 'rsc', 'next-router-prefetch', 'next-router-state-tree', 'accept'] },
        cookies: { none: true },
        queryString: { all: true }
      }
    });
  });

  test('routes the API, data, image and static paths in a fixed order', () => {
    const routeRewrites = routeRewritesOf();

    expect(routeRewrites.map(({ path }) => path)).toEqual(['api/*', '_next/data/*', '_next/image*', '<<TBD_STATIC>>']);

    // API and data requests reach the server with the server's own caching and forwarding.
    routeRewrites.slice(0, 2).forEach((routeRewrite) => {
      expect(routeRewrite.routeTo).toBeUndefined();
      expect(routeRewrite.forwardingOptions).toEqual(serverCdnOf().forwardingOptions);
      expect(asCloudformationValue(routeRewrite.edgeFunctions?.onRequest)).toEqual(hostHeaderRewriteFunctionArn);
    });

    expect(routeRewrites[2].routeTo).toEqual({ type: 'function', properties: { functionName: 'site.imageFunction' } });
    // Image requests carry no origin request policy and are not keyed on the Next.js routing headers.
    expect(routeRewrites[2].cachingOptions?.cacheKeyParameters?.headers).toEqual({ none: true });
    expect(asCloudformationValue(routeRewrites[2].forwardingOptions?.originRequestPolicyId)).toEqual({
      Ref: 'AWS::NoValue'
    });

    // The static route's real path patterns are only known after packaging, so a placeholder is emitted here and
    // replaced by a template override later.
    expect(asCloudformationValue(routeRewrites[3])).toEqual({
      path: '<<TBD_STATIC>>',
      forwardingOptions: {
        allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
        originRequestPolicyId: { Ref: 'AWS::NoValue' }
      },
      cachingOptions: {
        cacheMethods: ['GET', 'HEAD', 'OPTIONS'],
        cachePolicyId: '658327ea-f89d-4fab-a63d-7e88639e58f6'
      },
      routePrefix: '/_assets',
      routeTo: { type: 'bucket', properties: { bucketName: 'site.bucket', disableUrlNormalization: true } }
    });
  });

  test('folds the authored distribution settings in without moving the synthesized routes', () => {
    const customDomains = [{ domainName: 'example.com' }];
    const properties = {
      appDirectory: './',
      useFirewall: 'firewall',
      customDomains,
      cdn: { disableInvalidationAfterDeploy: true, defaultCachingOptions: { defaultTTL: 60, minTTL: 30 } }
    };
    const cdn = serverCdnOf(properties);

    expect(cdn.useFirewall).toBe('firewall');
    expect(cdn.customDomains).toEqual(customDomains);
    expect(cdn.disableInvalidationAfterDeploy).toBe(true);
    expect(cdn.cachingOptions?.defaultTTL).toBe(60);
    expect(cdn.cachingOptions?.minTTL).toBe(30);
    // Everything the override did not mention survives, and the synthesized routes keep the unmerged server caching.
    expect(cdn.cachingOptions?.maxTTL).toBe(31536000);
    expect(routeRewritesOf(properties)[0].cachingOptions?.defaultTTL).toBe(0);
  });

  test('lets a path caching override retune a synthesized route, and adds a new one for any other path', () => {
    const retuned = routeRewritesOf({
      appDirectory: './',
      cdn: { pathCachingOverrides: [{ path: '/_next/image*', cachingOptions: { defaultTTL: 120 } }] }
    });

    // Matching ignores a leading slash, merges caching only, and leaves the image-function origin in place.
    expect(retuned.map(({ path }) => path)).toEqual(['api/*', '_next/data/*', '_next/image*', '<<TBD_STATIC>>']);
    expect(retuned[2].cachingOptions?.defaultTTL).toBe(120);
    expect(retuned[2].cachingOptions?.maxTTL).toBe(31536000);
    expect(retuned[2].routeTo?.type).toBe('function');

    const added = routeRewritesOf({
      appDirectory: './',
      cdn: { pathCachingOverrides: [{ path: '/blog/*', cachingOptions: { defaultTTL: 5 } }] }
    });

    expect(added.map(({ path }) => path)).toEqual([
      'api/*',
      '_next/data/*',
      '_next/image*',
      '<<TBD_STATIC>>',
      '/blog/*'
    ]);
    // A path the framework does not route becomes a new rewrite served by the server defaults.
    expect(added[4].routeTo).toBeUndefined();
    expect(added[4].forwardingOptions?.originRequestPolicyId).toBe('b689b0a8-53d0-40ab-baf2-68738e2966ac');
    expect(asCloudformationValue(added[4].edgeFunctions?.onRequest)).toEqual(hostHeaderRewriteFunctionArn);
    expect(added[4].cachingOptions?.defaultTTL).toBe(5);
    expect(added[4].cachingOptions?.cacheKeyParameters?.headers).toEqual({
      whitelist: ['next-url', 'rsc', 'next-router-prefetch', 'next-router-state-tree', 'accept']
    });
  });

  test('uploads the OpenNext bucket content with cache headers, behind any authored file options', () => {
    const synthesizedFileOptions = [
      {
        includePattern: '_assets/_next/**/*',
        headers: [{ key: 'cache-control', value: 'public,max-age=31536000,immutable' }]
      },
      {
        excludePattern: '_assets/_next/**/*',
        includePattern: '_assets/**/*',
        headers: [{ key: 'cache-control', value: 'public,max-age=0,s-maxage=31536000,must-revalidate' }]
      }
    ];
    const { directoryUpload } = childrenOf().bucket;

    // Content-hashed assets are immutable; everything else revalidates.
    expect(directoryUpload?.directoryPath).toBe(`${openNextBuildPath}/bucket-content`);
    expect(directoryUpload?.fileOptions).toEqual(synthesizedFileOptions);

    const authoredFileOption = {
      includePattern: 'downloads/**/*',
      headers: [{ key: 'content-disposition', value: 'attachment' }]
    };

    expect(
      childrenOf({ appDirectory: './', fileOptions: [authoredFileOption] }).bucket.directoryUpload?.fileOptions
    ).toEqual([authoredFileOption, ...synthesizedFileOptions]);
  });

  test('serves the site from either a server Lambda or an edge server, never both', () => {
    const lambdaServed = childrenOf();
    const edgeServed = childrenOf({ appDirectory: './', useEdgeLambda: true });

    expect([lambdaServed.serverFunction, lambdaServed.serverEdgeFunction].map(Boolean)).toEqual([true, false]);
    expect([edgeServed.serverFunction, edgeServed.serverEdgeFunction].map(Boolean)).toEqual([false, true]);
    // Without an edge server there is nothing to run on origin request.
    expect(requireChild(lambdaServed.serverFunction, 'a server function').cdn?.edgeFunctions?.onOriginRequest).toBe(
      undefined as unknown as string
    );
    // The edge server carries no distribution of its own — the bucket does, and a Lambda@Edge origin-request function
    // sees the URL as sent, so URL normalization has to be off.
    expect('cdn' in requireChild(edgeServed.serverEdgeFunction, 'a server edge function')).toBe(false);
    expect(edgeServed.bucket.cdn).toBeDefined();
    expect(lambdaServed.bucket.cdn).toBeUndefined();

    const edgeBucketCdn = requireChild(edgeServed.bucket.cdn, 'a CDN in front of the bucket');

    expect(edgeBucketCdn.enabled).toBe(true);
    expect(edgeBucketCdn.disableUrlNormalization).toBe(true);
    // Every edge-function slot points at the edge server, so each behavior invokes it on origin request.
    expect(edgeBucketCdn.edgeFunctions?.onOriginRequest).toBe('site.serverEdgeFunction');
    expect(
      (edgeBucketCdn.routeRewrites || []).slice(0, 2).map(({ edgeFunctions }) => edgeFunctions?.onOriginRequest)
    ).toEqual(['site.serverEdgeFunction', 'site.serverEdgeFunction']);
  });

  test('adds a warmer only for a Lambda-served site that asks for warm instances', () => {
    expect(childrenOf().warmerFunction).toBeUndefined();
    expect(childrenOf({ appDirectory: './', warmServerInstances: 0 }).warmerFunction).toBeUndefined();
    // An edge server cannot be warmed, so the warmer is dropped even when instances were requested.
    expect(
      childrenOf({ appDirectory: './', useEdgeLambda: true, warmServerInstances: 2 }).warmerFunction
    ).toBeUndefined();

    const warmerFunction = requireChild(
      childrenOf({ appDirectory: './', warmServerInstances: 2 }).warmerFunction,
      'a warmer function'
    );

    // The concurrency is passed through as the authored number, not stringified.
    expect(asCloudformationValue(warmerFunction.environment)).toEqual([
      { name: 'FUNCTION_NAME', value: { Ref: cfLogicalNames.lambda('siteServerFunction') } },
      { name: 'CONCURRENCY', value: 2 }
    ]);
    expect(warmerFunction.events).toEqual([{ type: 'schedule', properties: { scheduleRate: 'rate(5 minutes)' } }]);
  });

  test('drains revalidation through a FIFO queue, a batched consumer and a tag-keyed table', () => {
    const children = childrenOf();

    expect(children.revalidationQueue.fifoEnabled).toBe(true);
    expect(children.revalidationQueue.longPollingSeconds).toBe(20);
    expect(children.revalidationFunction.events).toEqual([
      { type: 'sqs', properties: { sqsQueueName: 'site.revalidationQueue', batchSize: 5 } }
    ]);
    expect(children.revalidationTable.primaryKey).toEqual({
      partitionKey: { name: 'tag', type: 'string' },
      sortKey: { name: 'path', type: 'string' }
    });
    expect(children.revalidationTable.enablePointInTimeRecovery).toBe(true);
    expect(children.revalidationTable.secondaryIndexes).toEqual([
      {
        name: 'revalidate',
        partitionKey: { name: 'path', type: 'string' },
        sortKey: { name: 'revalidatedAt', type: 'number' }
      }
    ]);
  });

  test('keeps the authored properties beside the children, for every authored resource', () => {
    const nextjsWeb = nextjsWebFor({ appDirectory: './site', buildCommand: 'npm run build', useEdgeLambda: true });

    expect(nextjsWeb.name).toBe('site');
    expect(nextjsWeb.type).toBe('nextjs-web');
    expect(nextjsWeb.nameChain).toEqual(['site']);
    expect(nextjsWeb.appDirectory).toBe('./site');
    expect(nextjsWeb.buildCommand).toBe('npm run build');
    expect(nextjsWeb.useEdgeLambda).toBe(true);

    const manager = managerFor({
      marketing: { type: 'nextjs-web', properties: { appDirectory: './marketing' } },
      docs: { type: 'nextjs-web', properties: { appDirectory: './docs' } }
    });

    expect(manager.nextjsWebs.map(({ name }) => name)).toEqual(['marketing', 'docs']);
    expect(manager.nextjsWebs.map(({ _nestedResources }) => _nestedResources.bucket.name)).toEqual([
      'marketingBucket',
      'docsBucket'
    ]);
  });
});
