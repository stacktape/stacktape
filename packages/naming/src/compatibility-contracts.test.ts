import { describe, expect, test } from 'bun:test';
import { getStpNameForAlarm } from './alarm-names';
import { cfLogicalNames } from './cloudformation-logical-names';
import {
  CURRENT_DEFAULT_DOMAINS_VERSION,
  getDefaultDomainRootSuffix,
  getDefaultDomainSuffixForStack,
  getPrefixForUserAppResourceDefaultDomainName,
  getUserPoolDomainPrefix,
  isDefaultDomainSuffixForStack
} from './domain-names';
import { helperLambdaAwsResourceNames } from './helper-lambda-resource-names';
import { stackMetadataNames } from './stack-metadata-names';
import { getStpNameForResource } from './stacktape-resource-names';
import {
  getJobName,
  getLocalInvokeContainerName,
  getSimpleServiceDefaultContainerName,
  injectedParameterEnvVarName,
  portMappingsPortName
} from './workload-names';

describe('migrated naming compatibility contracts', () => {
  test('preserves representative CloudFormation logical IDs', () => {
    expect({
      bucket: cfLogicalNames.bucket('uploads'),
      lambda: cfLogicalNames.lambda('api'),
      blueGreenService: cfLogicalNames.ecsService('web', true),
      route: cfLogicalNames.httpApiRoute({ method: 'GET', path: '/users/{id}', stpResourceName: 'api' }),
      longDnsRecord: cfLogicalNames.dnsRecord(
        'this-is-an-extremely-long-subdomain-name-that-needs-to-be-shortened.for-a-very-long-example-domain-name.example.com'
      ),
      privateRegistryResource: cfLogicalNames.atlasMongoProject()
    }).toEqual({
      bucket: 'UploadsBucket',
      lambda: 'ApiFunction',
      blueGreenService: 'WebBlueGreenService',
      route: 'StpApiGetUsersIdRoute',
      longDnsRecord: 'StpThisIsAnExtrLongSubdNameThatNeedToBeShorForAVeryLongExamDomaNameExamComRecordSet',
      privateRegistryResource: 'StpAtlasMongoProject'
    });
  });

  test('preserves stack metadata keys', () => {
    expect(
      Object.fromEntries(Object.entries(stackMetadataNames).map(([name, getValue]) => [name, getValue()]))
    ).toEqual({
      imageCount: 'imageCount',
      functionCount: 'functionCount',
      isDevStack: 'isDevStack',
      deploymentBucket: 'deploymentBucket',
      atlasMongoPrivateTypesMajorVersionUsed: 'mongoDbModuleMajorVersion',
      upstashRedisPrivateTypesMajorVersionUsed: 'upstashRedisModuleMajorVersion',
      budgetName: 'budgetName',
      cloudformationRoleArn: 'cloudformationRoleArn',
      stackConsole: 'stackConsole',
      name: 'name',
      createdTime: 'createdTime',
      lastUpdatedTime: 'lastUpdatedTime',
      monthToDateSpend: 'monthToDateSpend',
      monthForecastedSpend: 'monthForecastedSpend',
      natPublicIps: 'natPublicIps',
      devAgentRoleExternalId: 'devAgentRoleExternalId',
      debugAgentRoleExternalId: 'debugAgentRoleExternalId',
      rollbackSafety: 'rollbackSafety'
    });
  });

  test('preserves domain, workload and Stacktape resource identifiers', () => {
    expect(
      getPrefixForUserAppResourceDefaultDomainName({
        stpResourceName: 'Dashboard',
        stackName: 'my-project-dev',
        cdn: true
      })
    ).toBe('dashboard-cdn-my-project-dev');
    expect(getUserPoolDomainPrefix('My-Project-Dev', 'Customers')).toBe('my-project-dev-customers');
    expect(getJobName({ workloadName: 'Worker', workloadType: 'worker-service', containerName: 'API' })).toBe(
      'worker-api'
    );
    expect(getJobName({ workloadName: 'FunctionName', workloadType: 'function' })).toBe('FunctionName');
    expect(getSimpleServiceDefaultContainerName()).toBe('service-container');
    expect(getLocalInvokeContainerName('worker-api')).toBe('invoke-local-worker-api');
    expect(portMappingsPortName(3000)).toBe('port-3000');
    expect(injectedParameterEnvVarName('database.credentials', 'masterPassword')).toBe(
      'STP_DATABASE_CREDENTIALS_MASTER_PASSWORD'
    );
    expect(
      getStpNameForResource({
        nameChain: ['web', 'listener', 'rule'],
        parentResourceType: 'web-service'
      })
    ).toBe('webListener');
    expect(getStpNameForResource({ nameChain: ['queue', 'dead-letter'] })).toBe('queueDead-letter');
    expect(
      getStpNameForAlarm({
        nameChain: ['api', 'latency'],
        alarmTriggerType: 'error-rate',
        alarmIndexOrGlobalAlarmName: 2
      })
    ).toBe('ErrorRateForApiLatency2');
  });

  test('derives and validates the default domain suffix from stack identity', () => {
    const stack = {
      accountId: '123456789012',
      region: 'eu-west-1',
      stackName: 'my-project-production',
      version: CURRENT_DEFAULT_DOMAINS_VERSION
    };
    const suffix = getDefaultDomainSuffixForStack(stack);

    expect(suffix).toBe('-de773011.stacktape-app.com');
    expect(getDefaultDomainRootSuffix({ version: CURRENT_DEFAULT_DOMAINS_VERSION })).toBe('.stacktape-app.com');
    expect(isDefaultDomainSuffixForStack({ domainName: `api${suffix}`, ...stack })).toBe(true);
    expect(getDefaultDomainSuffixForStack({ ...stack, version: 2 })).toBeUndefined();
  });

  test('preserves helper Lambda physical names and truncation', () => {
    expect(helperLambdaAwsResourceNames.originRequestEdgeLambda('a'.repeat(80), 'us-east-1')).toBe(
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa-294f10'
    );
    expect(helperLambdaAwsResourceNames.edgeDeploymentBucket('abc123')).toBe('stp-edge-deployment-bucket-abc123');
  });
});
