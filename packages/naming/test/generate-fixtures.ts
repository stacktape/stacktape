import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { arns } from '../src/arns.ts';
import { awsResourceNames, codebuildDeploymentBucketResourceName } from '../src/aws-resource-names.ts';
import { cfRegistryNames } from '../src/cloudformation-registry-names.ts';
import { stacktapeCloudfrontHeaders } from '../src/cloudfront-header-names.ts';
import { getPrefixForUserAppResourceDefaultDomainName, normalizeDomainName } from '../src/domain-names.ts';
import { helperLambdaAwsResourceNames } from '../src/helper-lambdas-resource-names.ts';
import { cfLogicalNames } from '../src/logical-names.ts';
import { stackMetadataNames } from '../src/metadata-names.ts';
import {
  buildLambdaS3Key,
  buildLayerS3Key,
  buildResourceNameInfo,
  getAlarmDescription,
  getBaseAwsConsoleLink,
  getBaseS3EndpointForRegion,
  getBatchRetryStateName,
  getCfTemplateS3Key,
  getCloudformationTemplateUrl,
  getConvexRuntimeSecretLogicalName,
  getConvexSecretName,
  getCustomAlarmDescription,
  getEcrImageUrl,
  getEcrRepositoryUrl,
  getEfsVolumeName,
  getExportedStackOutputName,
  getJobName,
  getLocalInvokeContainerName,
  getRoleArnFromSessionArn,
  getSimpleServiceDefaultContainerName,
  getStackCfTemplateDescription,
  getStackOutputName,
  getStacktapeStackInfoFromTemplateDescription,
  getStpTemplateS3Key,
  getStpNameForAlarm,
  getStpNameForResource,
  getUserPoolDomainPrefix,
  injectedParameterEnvVarName
} from '../src/names.ts';
import { resourceReferencableParams } from '../src/referenceable-parameter-names.ts';
import {
  buildSSMParameterNameForReferencableParam,
  getLegacySsmParameterStoreStackPrefix,
  getSsmParameterNameForDomainInfo,
  getSsmParameterNameForThirdPartyCredentials,
  getSsmParameterStoreStackPrefix,
  getStacktapeApiKeySsmParameterName,
  parseDomainNameFromSmmParamName
} from '../src/ssm-parameter-names.ts';
import { outputNames } from '../src/stack-output-names.ts';
import { tagNames } from '../src/tag-names.ts';

type FixtureFunction = (...args: never[]) => unknown;
type FixtureCase = { readonly args: readonly unknown[]; readonly expected: unknown };
type NamedFixtureCase = FixtureCase & { readonly name: string };

const fixturePath = fileURLToPath(new URL('fixtures/legacy-17aef681.json', import.meta.url));

const booleanParameter =
  /^(blueGreen|cdn|edgeLambda|gpu|isAuroraCluster|isCluster|isFifo|networkLoadBalancer|publicSubnet|spot)$/;
const numericParameter =
  /(azIndex|cacheBehaviourIndex|eventIndex|exposurePort|index|instanceNum|layerNumber|mountTargetIndex|port|priority|replicaNum)$/i;

const valueForParameter = (methodName: string, parameterName: string): unknown => {
  if (booleanParameter.test(parameterName)) {
    return true;
  }
  if (numericParameter.test(parameterName)) {
    return 2;
  }
  if (parameterName === 'configParentResourceType') {
    return 'batch-job';
  }
  if (parameterName === 'fullyQualifiedDomainName') {
    return 'api.preview.example.com';
  }
  if (parameterName === 'method') {
    return 'GET';
  }
  if (parameterName === 'path') {
    return '/users/{userId}';
  }
  if (parameterName === 'rootDirectory') {
    return '/data/cache';
  }
  if (parameterName === 'type') {
    return methodName === 'vpcGatewayEndpoint' ? 's3' : 'DefDynamic';
  }
  return `${parameterName}-fixture`;
};

const parameterSource = (fn: FixtureFunction): string => {
  const source = fn.toString();
  const openParenthesis = source.indexOf('(');
  let depth = 0;
  for (let index = openParenthesis; index < source.length; index += 1) {
    if (source[index] === '(') {
      depth += 1;
    } else if (source[index] === ')') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(openParenthesis + 1, index).trim();
      }
    }
  }
  throw new Error(`Unable to inspect fixture function: ${source.slice(0, 80)}`);
};

const fixtureArguments = (methodName: string, fn: FixtureFunction): readonly unknown[] => {
  const parameters = parameterSource(fn);
  if (!parameters) {
    return [];
  }
  if (parameters.startsWith('{')) {
    const propertyNames = [...parameters.matchAll(/\b([A-Za-z][A-Za-z0-9]*)\b/g)]
      .map((match) => match[1])
      .filter((name): name is string => Boolean(name));
    return [
      Object.fromEntries(
        [...new Set(propertyNames)].map((propertyName) => [propertyName, valueForParameter(methodName, propertyName)])
      )
    ];
  }
  return parameters
    .split(',')
    .map((parameter) => parameter.trim())
    .filter(Boolean)
    .map((parameterName) => valueForParameter(methodName, parameterName));
};

const invokeRecord = (
  record: object,
  argumentOverrides: Readonly<Record<string, readonly unknown[]>> = {}
): Record<string, FixtureCase> =>
  Object.fromEntries(
    Object.entries(record).map(([methodName, value]) => {
      const fn = value as FixtureFunction;
      const args = argumentOverrides[methodName] ?? fixtureArguments(methodName, fn);
      return [methodName, { args, expected: fn.apply(record, args as never[]) }];
    })
  );

const invokeNamedCase = (record: object, name: string, args: readonly unknown[]): NamedFixtureCase => {
  const fn = Object.getOwnPropertyDescriptor(record, name)?.value as FixtureFunction;
  return { name, args, expected: fn.apply(record, args as never[]) };
};

const physicalArgumentOverrides = {
  httpApiLogGroup: [{ stackName: 'billing-prod', stpResourceName: 'public-api' }]
} as const;

const generatedFixture = {
  source: {
    classification: 'must-preserve',
    legacyCommit: '17aef681',
    legacySourceBlobs: {
      physical: 'ce8383ce63ef75d9afaafdfda8c85fe7d39e4fc1',
      logical: 'd0d68acdbcf26eef69e790b81f010376c74c548e',
      utilities: 'd7bad998067efe585e601793c3b65b7a64d67097'
    },
    changeCaseVersion: '5.4.4',
    note: 'Golden outputs generated from v4 and differentially verified against exact v3 source snapshots by the package test gate.'
  },
  logicalNames: invokeRecord(cfLogicalNames),
  physicalNames: invokeRecord(awsResourceNames, physicalArgumentOverrides),
  branchCases: {
    logical: [
      invokeNamedCase(cfLogicalNames, 'batchComputeEnvironment', [false, false]),
      invokeNamedCase(cfLogicalNames, 'batchComputeEnvironment', [true, false]),
      invokeNamedCase(cfLogicalNames, 'batchComputeEnvironment', [false, true]),
      invokeNamedCase(cfLogicalNames, 'batchJobQueue', [false, false]),
      invokeNamedCase(cfLogicalNames, 'subnet', [false, 2]),
      invokeNamedCase(cfLogicalNames, 'lambda', ['orders', false]),
      invokeNamedCase(cfLogicalNames, 'lambda', ['orders', true]),
      invokeNamedCase(cfLogicalNames, 'routeTable', [false, 2]),
      invokeNamedCase(cfLogicalNames, 'atlasMongoVpcRoute', [false, 2]),
      invokeNamedCase(cfLogicalNames, 'routeTableToSubnetAssociation', [false, 2]),
      invokeNamedCase(cfLogicalNames, 'ecsService', ['orders', false]),
      invokeNamedCase(cfLogicalNames, 'targetGroup', [
        {
          loadBalancerName: 'public',
          stpResourceName: 'orders',
          targetContainerPort: undefined,
          blueGreen: false
        }
      ]),
      invokeNamedCase(cfLogicalNames, 'customResourceDefaultDomain', ['orders', false]),
      invokeNamedCase(cfLogicalNames, 'customResourceDefaultDomain', ['orders', true])
    ],
    physical: [
      invokeNamedCase(awsResourceNames, 'batchComputeEnvironment', ['billing-prod', false, false]),
      invokeNamedCase(awsResourceNames, 'batchComputeEnvironment', ['billing-prod', true, false]),
      invokeNamedCase(awsResourceNames, 'batchComputeEnvironment', ['billing-prod', false, true]),
      invokeNamedCase(awsResourceNames, 'batchJobQueue', ['billing-prod', false, false]),
      invokeNamedCase(awsResourceNames, 'dbLogGroup', ['orders', false, 'error']),
      invokeNamedCase(awsResourceNames, 'dbLogGroup', ['orders', true, 'error']),
      invokeNamedCase(awsResourceNames, 'ecsService', ['orders', 'billing-prod', false]),
      invokeNamedCase(awsResourceNames, 'loadBalancerSecurityGroup', ['public', 'billing-prod', false]),
      invokeNamedCase(awsResourceNames, 'loadBalancerSecurityGroup', ['public', 'billing-prod', true]),
      invokeNamedCase(awsResourceNames, 'lambdaLogGroup', [
        { lambdaAwsResourceName: 'billing-prod-orders', edgeLambda: false }
      ]),
      invokeNamedCase(awsResourceNames, 'lambdaLogGroup', [
        { lambdaAwsResourceName: 'billing-prod-orders', edgeLambda: true }
      ]),
      invokeNamedCase(awsResourceNames, 'sqsQueue', ['orders', 'billing-prod', false]),
      invokeNamedCase(awsResourceNames, 'sqsQueue', ['orders', 'billing-prod', true]),
      invokeNamedCase(awsResourceNames, 'snsTopic', ['orders', 'billing-prod', false]),
      invokeNamedCase(awsResourceNames, 'snsTopic', ['orders', 'billing-prod', true])
    ]
  },
  constantModules: {
    cloudformationRegistryNames: invokeRecord(cfRegistryNames),
    cloudfrontHeaderNames: invokeRecord(stacktapeCloudfrontHeaders),
    metadataNames: invokeRecord(stackMetadataNames),
    outputNames: invokeRecord(outputNames),
    referenceableParameterNames: invokeRecord(resourceReferencableParams),
    tagNames: invokeRecord(tagNames)
  },
  focusedCases: {
    arns: invokeRecord(arns),
    helperLambdaNames: invokeRecord(helperLambdaAwsResourceNames),
    codebuildDeploymentBucketResourceName: codebuildDeploymentBucketResourceName('eu-west-1', '123456789012'),
    domains: [
      getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'PublicApi',
        stackName: 'billing-prod',
        cdn: false
      }),
      getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'PublicApi',
        stackName: 'billing-prod',
        cdn: true
      }),
      normalizeDomainName('API.Example.COM.')
    ],
    ssm: [
      getLegacySsmParameterStoreStackPrefix({ stackName: 'billing-prod' }),
      getSsmParameterStoreStackPrefix({ stackName: 'billing-prod', region: 'eu-west-1' }),
      getStacktapeApiKeySsmParameterName({
        region: 'eu-west-1',
        userId: 'user-1',
        invocationId: 'invoke-1'
      }),
      buildSSMParameterNameForReferencableParam({
        nameChain: ['api', 'database'],
        paramName: 'connectionString',
        stackName: 'billing-prod',
        region: 'eu-west-1'
      }),
      getSsmParameterNameForDomainInfo({ domainName: 'api.example.com', region: 'eu-west-1' }),
      getSsmParameterNameForThirdPartyCredentials({
        credentialsIdentifier: 'github-main',
        region: 'eu-west-1'
      }),
      parseDomainNameFromSmmParamName({
        paramName: '/stp/eu-west-1/api.example.com',
        region: 'eu-west-1'
      })
    ],
    utilities: {
      awsConsoleLink: getBaseAwsConsoleLink('eu-west-1', 'cloudformation', 'stacks/events?stackId=stack'),
      ecrImageUrl: getEcrImageUrl('123.dkr.ecr.eu-west-1.amazonaws.com/app', 'latest'),
      cfTemplateKey: getCfTemplateS3Key('4.2.0'),
      stpTemplateKey: getStpTemplateS3Key('4.2.0'),
      cfTemplateUrl: getCloudformationTemplateUrl('deployments', 'cn-north-1', '4.2.0'),
      stackDescription: getStackCfTemplateDescription('billing', 'prod', 'abc123'),
      parsedStackDescription: getStacktapeStackInfoFromTemplateDescription('STP-stack_billing_prod_abc123'),
      simpleServiceContainer: getSimpleServiceDefaultContainerName(),
      ecrRepository: getEcrRepositoryUrl('123456789012', 'eu-west-1', 'billing'),
      standardS3Endpoint: getBaseS3EndpointForRegion('eu-west-1'),
      govCloudS3Endpoint: getBaseS3EndpointForRegion('us-gov-west-1'),
      chinaS3Endpoint: getBaseS3EndpointForRegion('cn-north-1'),
      localInvokeContainer: getLocalInvokeContainerName('orders-worker'),
      userPoolDomain: getUserPoolDomainPrefix('billing-prod', 'Customers'),
      lambdaS3Key: buildLambdaS3Key('orders', '4.2.0', 'abc123'),
      lambdaS3KeyWithoutDigest: buildLambdaS3Key('orders', '4.2.0', ''),
      layerS3Key: buildLayerS3Key(2, '4.2.0', 'abc123'),
      truncated: buildResourceNameInfo({
        proposedResourceName: 'billing-production-orders-worker-exceeding-the-service-limit',
        lengthLimit: 32
      }),
      untouched: buildResourceNameInfo({ proposedResourceName: 'billing-dev-api', lengthLimit: 64 }),
      output: getStackOutputName('orders-api', 'connection_string'),
      export: getExportedStackOutputName('OrdersApiConnectionString', 'billing-prod'),
      nestedResource: getStpNameForResource({
        nameChain: ['frontend', 'loadBalancer', 'listener'],
        parentResourceType: 'web-service'
      }),
      ordinaryResource: getStpNameForResource({ nameChain: ['frontend', 'loadBalancer', 'listener'] }),
      alarm: getStpNameForAlarm({
        nameChain: ['orders', 'worker'],
        alarmTriggerType: 'error-rate',
        alarmIndexOrGlobalAlarmName: 3
      }),
      job: getJobName({
        workloadName: 'OrdersWorker',
        workloadType: 'worker-service',
        containerName: 'Processor'
      }),
      injectedEnvironmentVariable: injectedParameterEnvVarName('orders.database', 'connectionString'),
      alarmDescription: getAlarmDescription({
        triggerType: 'error-rate',
        threshold: 5,
        comparisonOperator: 'GreaterThanThreshold',
        stpResourceName: 'orders',
        stackName: 'billing-prod',
        statFunction: 'Average'
      }),
      customAlarmDescription: getCustomAlarmDescription({
        metricName: 'PendingJobs',
        threshold: 10,
        comparisonOperator: 'GreaterThanThreshold',
        stpResourceName: 'orders',
        stackName: 'billing-prod'
      }),
      roleArn: getRoleArnFromSessionArn('arn:aws:sts::123456789012:assumed-role/orders-role/session-1'),
      efsVolume: getEfsVolumeName('sharedData', '/cache/uploads'),
      convexSecret: getConvexSecretName({
        region: 'eu-west-1',
        stackName: 'billing-prod',
        nameChain: ['analytics', 'runtime']
      }),
      convexRuntimeLogicalName: getConvexRuntimeSecretLogicalName('analytics-service'),
      batchRetryState: getBatchRetryStateName('spot', 2)
    }
  }
};

const generatedText = `${JSON.stringify(generatedFixture, null, 2)}\n`;
const write = process.argv.includes('--write');

if (write) {
  await writeFile(fixturePath, generatedText);
} else {
  const existingText = await readFile(fixturePath, 'utf8');
  if (JSON.stringify(JSON.parse(existingText)) !== JSON.stringify(generatedFixture)) {
    throw new Error('Naming compatibility fixtures are stale. Run `pnpm fixtures:generate` and review the diff.');
  }
}
