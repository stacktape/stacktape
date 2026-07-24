import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
import { awsResourceNames } from '../src/aws-resource-names.ts';
import { cfLogicalNames } from '../src/logical-names.ts';
import * as currentNames from '../src/names.ts';

type FixtureCase = { readonly args: readonly unknown[]; readonly expected: unknown };
type FixtureMap = Readonly<Record<string, FixtureCase>>;

const legacyRepository = process.argv.slice(2).find((argument) => argument !== '--');
if (!legacyRepository) {
  throw new Error('Pass the legacy repository path: `pnpm test:legacy -- C:\\Projects\\stacktape`.');
}

const primitivesUrl = pathToFileURL(
  new URL('legacy-primitives-adapter.mjs', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')
).href;

const loadLegacyModule = async (
  sourcePath: string,
  replacements: Readonly<Record<string, string>>
): Promise<Record<string, unknown>> => {
  let source = execFileSync('git', ['-C', legacyRepository, 'show', `17aef681:${sourcePath}`], {
    encoding: 'utf8'
  });
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

const legacyPhysicalModule = await loadLegacyModule('shared/naming/aws-resource-names.ts', {
  "from 'change-case'": `from '${primitivesUrl}'`,
  "from '../utils/short-hash'": `from '${primitivesUrl}'`,
  "from './utils'": `from '${primitivesUrl}'`
});
const legacyLogicalModule = await loadLegacyModule('shared/naming/logical-names.ts', {
  "from 'change-case'": `from '${primitivesUrl}'`
});
const legacyUtilitiesModule = await loadLegacyModule('shared/naming/utils.ts', {
  "from '@shared/utils/constants'": `from '${primitivesUrl}'`,
  "from '@shared/utils/misc'": `from '${primitivesUrl}'`,
  "from 'change-case'": `from '${primitivesUrl}'`,
  "from '../../@generated/cloudform/functions'": `from '${primitivesUrl}'`,
  "from '../../src/config/random'": `from '${primitivesUrl}'`,
  "from './arns'": `from '${primitivesUrl}'`
});

const fixture = JSON.parse(await readFile(new URL('fixtures/legacy-17aef681.json', import.meta.url), 'utf8')) as {
  readonly logicalNames: FixtureMap;
  readonly physicalNames: FixtureMap;
};

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

compare(legacyLogicalModule.cfLogicalNames as object, cfLogicalNames, fixture.logicalNames);
compare(legacyPhysicalModule.awsResourceNames as object, awsResourceNames, fixture.physicalNames);

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
  } physical naming functions, plus ${Object.keys(utilityCases).length} utility algorithms, with legacy commit 17aef681.`
);
