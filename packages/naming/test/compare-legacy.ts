import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import { awsResourceNames } from '../src/aws-resource-names.ts';
import { cfLogicalNames } from '../src/logical-names.ts';
import * as currentNames from '../src/names.ts';

type FixtureCase = { readonly args: readonly unknown[]; readonly expected: unknown };
type NamedFixtureCase = FixtureCase & { readonly name: string };
type FixtureMap = Readonly<Record<string, FixtureCase>>;

const primitivesUrl = new URL('legacy-primitives-adapter.mjs', import.meta.url).href;
const changeCaseUrl = import.meta.resolve('change-case');

const legacySources = {
  physical: {
    url: new URL('legacy/aws-resource-names.ts.txt', import.meta.url),
    gitBlob: 'ce8383ce63ef75d9afaafdfda8c85fe7d39e4fc1'
  },
  logical: {
    url: new URL('legacy/logical-names.ts.txt', import.meta.url),
    gitBlob: 'd0d68acdbcf26eef69e790b81f010376c74c548e'
  },
  utilities: {
    url: new URL('legacy/utils.ts.txt', import.meta.url),
    gitBlob: 'd7bad998067efe585e601793c3b65b7a64d67097'
  }
} as const;

const readVerifiedLegacySource = async (sourceName: keyof typeof legacySources): Promise<string> => {
  const { url, gitBlob } = legacySources[sourceName];
  const source = await readFile(url, 'utf8');
  const blobIdentity = createHash('sha1')
    .update(`blob ${Buffer.byteLength(source)}\0`)
    .update(source)
    .digest('hex');
  assert.equal(blobIdentity, gitBlob, `${sourceName} legacy source identity`);
  return source;
};

const loadLegacyModule = async (
  sourceName: keyof typeof legacySources,
  replacements: Readonly<Record<string, string>>
): Promise<Record<string, unknown>> => {
  let source = await readVerifiedLegacySource(sourceName);
  for (const [from, to] of Object.entries(replacements)) {
    source = source.replace(from, to);
  }
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2024
    }
  }).outputText;
  const dataUrl = `data:text/javascript;base64,${Buffer.from(output).toString('base64')}`;
  return import(dataUrl) as Promise<Record<string, unknown>>;
};

const legacyPhysicalModule = await loadLegacyModule('physical', {
  "from 'change-case'": `from '${changeCaseUrl}'`,
  "from '../utils/short-hash'": `from '${primitivesUrl}'`,
  "from './utils'": `from '${primitivesUrl}'`
});
const legacyLogicalModule = await loadLegacyModule('logical', {
  "from 'change-case'": `from '${changeCaseUrl}'`
});
const legacyUtilitiesModule = await loadLegacyModule('utilities', {
  "from '@shared/utils/constants'": `from '${primitivesUrl}'`,
  "from '@shared/utils/misc'": `from '${primitivesUrl}'`,
  "from 'change-case'": `from '${changeCaseUrl}'`,
  "from '../../@generated/cloudform/functions'": `from '${primitivesUrl}'`,
  "from '../../src/config/random'": `from '${primitivesUrl}'`,
  "from './arns'": `from '${primitivesUrl}'`
});

const fixture = JSON.parse(await readFile(new URL('fixtures/legacy-17aef681.json', import.meta.url), 'utf8')) as {
  readonly source: {
    readonly legacyCommit: string;
    readonly legacySourceBlobs: Readonly<Record<keyof typeof legacySources, string>>;
  };
  readonly logicalNames: FixtureMap;
  readonly physicalNames: FixtureMap;
  readonly branchCases: {
    readonly logical: readonly NamedFixtureCase[];
    readonly physical: readonly NamedFixtureCase[];
  };
};

assert.equal(fixture.source.legacyCommit, '17aef681');
for (const [sourceName, { gitBlob }] of Object.entries(legacySources)) {
  assert.equal(fixture.source.legacySourceBlobs[sourceName as keyof typeof legacySources], gitBlob);
}

const compare = (legacyFunctions: object, currentFunctions: object, cases: FixtureMap): void => {
  assert.deepEqual(Object.keys(legacyFunctions).toSorted(), Object.keys(currentFunctions).toSorted());
  for (const [name, fixtureCase] of Object.entries(cases)) {
    const legacyFunction = Object.getOwnPropertyDescriptor(legacyFunctions, name)?.value as (
      ...args: never[]
    ) => unknown;
    const currentFunction = Object.getOwnPropertyDescriptor(currentFunctions, name)?.value as (
      ...args: never[]
    ) => unknown;
    const legacyResult = legacyFunction.apply(legacyFunctions, fixtureCase.args as never[]);
    const currentResult = currentFunction.apply(currentFunctions, fixtureCase.args as never[]);
    assert.deepEqual(currentResult, legacyResult, name);
    assert.deepEqual(currentResult, fixtureCase.expected, `${name} fixture`);
  }
};

const compareNamedCases = (
  legacyFunctions: object,
  currentFunctions: object,
  cases: readonly NamedFixtureCase[]
): void => {
  for (const { name, args, expected } of cases) {
    const legacyFunction = Object.getOwnPropertyDescriptor(legacyFunctions, name)?.value as (
      ...args: never[]
    ) => unknown;
    const currentFunction = Object.getOwnPropertyDescriptor(currentFunctions, name)?.value as (
      ...args: never[]
    ) => unknown;
    const legacyResult = legacyFunction.apply(legacyFunctions, args as never[]);
    const currentResult = currentFunction.apply(currentFunctions, args as never[]);
    assert.deepEqual(currentResult, legacyResult, `${name} branch`);
    assert.deepEqual(currentResult, expected, `${name} branch fixture`);
  }
};

compare(legacyLogicalModule.cfLogicalNames as object, cfLogicalNames, fixture.logicalNames);
compare(legacyPhysicalModule.awsResourceNames as object, awsResourceNames, fixture.physicalNames);
compareNamedCases(legacyLogicalModule.cfLogicalNames as object, cfLogicalNames, fixture.branchCases.logical);
compareNamedCases(legacyPhysicalModule.awsResourceNames as object, awsResourceNames, fixture.branchCases.physical);

const utilityCases: Readonly<Record<string, readonly (readonly unknown[])[]>> = {
  getEcrImageTag: [['orders', '4.2.0', 'abc123']],
  getJobNameForSingleContainerWorkload: [['OrdersWorker']],
  getJobNameForMultiContainerWorkload: [['OrdersWorker', 'Processor']],
  getBaseAwsConsoleLink: [['eu-west-1', 'cloudformation', 'stacks/events']],
  getEcrImageUrl: [['123.dkr.ecr.eu-west-1.amazonaws.com/app', 'latest']],
  getCloudformationTemplateUrl: [['deployments', 'cn-north-1', '4.2.0']],
  getCfTemplateS3Key: [['4.2.0']],
  getStpTemplateS3Key: [['4.2.0']],
  getStackName: [['billing', 'prod']],
  getStackCfTemplateDescription: [['billing', 'prod', 'abc123']],
  isStacktapeStackDescription: [['STP-stack_billing_prod_abc123'], ['other']],
  getStacktapeStackInfoFromTemplateDescription: [['STP-stack_billing_prod_abc123'], ['other']],
  getSimpleServiceDefaultContainerName: [[]],
  getEcrRepositoryUrl: [['123456789012', 'eu-west-1', 'billing']],
  getBaseS3EndpointForRegion: [['eu-west-1'], ['us-gov-west-1'], ['cn-north-1']],
  getLocalInvokeContainerName: [['orders-worker']],
  getJobName: [
    [{ workloadName: 'Orders', workloadType: 'function' }],
    [{ workloadName: 'Orders', workloadType: 'worker-service' }],
    [{ workloadName: 'Orders', workloadType: 'worker-service', containerName: 'Processor' }]
  ],
  getUserPoolDomainPrefix: [['billing-prod', 'Customers']],
  buildLambdaS3Key: [
    ['orders', '4.2.0', 'abc123'],
    ['orders', '4.2.0', '']
  ],
  buildLayerS3Key: [
    [2, '4.2.0', 'abc123'],
    [2, '4.2.0', '']
  ],
  getStpNameForResource: [
    [{ nameChain: ['frontend', 'loadBalancer', 'listener'], parentResourceType: 'web-service' }],
    [{ nameChain: ['frontend', 'loadBalancer', 'listener'] }]
  ],
  getStpNameForAlarm: [
    [{ nameChain: ['orders', 'worker'], alarmTriggerType: 'error-rate', alarmIndexOrGlobalAlarmName: 3 }]
  ],
  buildResourceName: [
    [{ proposedResourceName: 'billing-dev-api', lengthLimit: 64 }],
    [{ proposedResourceName: 'a'.repeat(65), lengthLimit: 64 }]
  ],
  getStackOutputName: [['orders-api', 'connection_string']],
  getExportedStackOutputName: [['OrdersApiConnectionString', 'billing-prod']],
  getLogGroupBaseName: [
    [
      {
        stpResourceName: 'orders',
        stackName: 'billing-prod',
        resourceNamespace: 'application',
        resourceType: 'ecs'
      }
    ]
  ],
  getAlarmDescription: [
    [
      {
        triggerType: 'error-rate',
        threshold: 5,
        comparisonOperator: 'GreaterThanThreshold',
        stpResourceName: 'orders',
        stackName: 'billing-prod',
        statFunction: 'Average'
      }
    ]
  ],
  getCustomAlarmDescription: [
    [
      {
        metricName: 'PendingJobs',
        threshold: 10,
        comparisonOperator: 'GreaterThanThreshold',
        stpResourceName: 'orders',
        stackName: 'billing-prod'
      }
    ]
  ],
  getRoleArnFromSessionArn: [['arn:aws:sts::123456789012:assumed-role/orders-role/session-1']],
  portMappingsPortName: [[8080]],
  injectedParameterEnvVarName: [['orders.database', 'connectionString']]
};

const currentUtilityFunctions = {
  getEcrImageTag: currentNames.getEcrImageTag,
  getJobNameForSingleContainerWorkload: currentNames.getJobNameForSingleContainerWorkload,
  getJobNameForMultiContainerWorkload: currentNames.getJobNameForMultiContainerWorkload,
  getBaseAwsConsoleLink: currentNames.getBaseAwsConsoleLink,
  getEcrImageUrl: currentNames.getEcrImageUrl,
  getCloudformationTemplateUrl: currentNames.getCloudformationTemplateUrl,
  getCfTemplateS3Key: currentNames.getCfTemplateS3Key,
  getStpTemplateS3Key: currentNames.getStpTemplateS3Key,
  getStackName: currentNames.getStackName,
  getStackCfTemplateDescription: currentNames.getStackCfTemplateDescription,
  isStacktapeStackDescription: currentNames.isStacktapeStackDescription,
  getStacktapeStackInfoFromTemplateDescription: currentNames.getStacktapeStackInfoFromTemplateDescription,
  getSimpleServiceDefaultContainerName: currentNames.getSimpleServiceDefaultContainerName,
  getEcrRepositoryUrl: currentNames.getEcrRepositoryUrl,
  getBaseS3EndpointForRegion: currentNames.getBaseS3EndpointForRegion,
  getLocalInvokeContainerName: currentNames.getLocalInvokeContainerName,
  getJobName: currentNames.getJobName,
  getUserPoolDomainPrefix: currentNames.getUserPoolDomainPrefix,
  buildLambdaS3Key: currentNames.buildLambdaS3Key,
  buildLayerS3Key: currentNames.buildLayerS3Key,
  getStpNameForResource: currentNames.getStpNameForResource,
  getStpNameForAlarm: currentNames.getStpNameForAlarm,
  buildResourceName: currentNames.buildResourceName,
  getStackOutputName: currentNames.getStackOutputName,
  getExportedStackOutputName: currentNames.getExportedStackOutputName,
  getLogGroupBaseName: currentNames.getLogGroupBaseName,
  getAlarmDescription: currentNames.getAlarmDescription,
  getCustomAlarmDescription: currentNames.getCustomAlarmDescription,
  getRoleArnFromSessionArn: currentNames.getRoleArnFromSessionArn,
  portMappingsPortName: currentNames.portMappingsPortName,
  injectedParameterEnvVarName: currentNames.injectedParameterEnvVarName
};

for (const [name, cases] of Object.entries(utilityCases)) {
  const legacyFunction = legacyUtilitiesModule[name] as (...args: never[]) => unknown;
  const currentFunction = currentUtilityFunctions[name as keyof typeof currentUtilityFunctions] as (
    ...args: never[]
  ) => unknown;
  for (const args of cases) {
    assert.deepEqual(currentFunction(...(args as never[])), legacyFunction(...(args as never[])), name);
  }
}

console.log(
  `Compared ${Object.keys(fixture.logicalNames).length} logical and ${
    Object.keys(fixture.physicalNames).length
  } physical naming functions, ${fixture.branchCases.logical.length + fixture.branchCases.physical.length} alternate branches, and ${
    Object.keys(utilityCases).length
  } utility algorithms with legacy commit 17aef681.`
);
