/**
 * A web build resolves its environment against the deployed stack before this deployment runs. The configuration
 * loads through the real resolver, its resources supplied by a `$Var()` directive, and the deployed stack holds an
 * HTTP API without a custom domain. This deployment adds the domain and a table, so neither the API's
 * `customDomainUrl` nor the table is deployed yet: those variables are left out with a warning and the others are
 * kept. A parameter name the API type does not have is a typo and stops the build, listing the names it has.
 */
import { afterAll, afterEach, beforeAll, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { resolveWebBuildEnvironment } from '@domain-services/packaging-manager';
import { CliError } from '@utils/errors';
import { synthesizeFixture } from './synthesis-fixture';

const DEPLOYED_API_URL = 'https://abc123.execute-api.eu-west-1.amazonaws.com';
const config = `variables:
  allResources:
    api:
      type: http-api-gateway
      properties:
        customDomains:
          - domainName: api.example.com
            customCertificateArn: arn:aws:acm:eu-west-1:123456789999:certificate/web-build-environment
            disableDnsRecordCreation: true
    records:
      type: dynamo-db-table
      properties:
        primaryKey:
          partitionKey:
            name: id
            type: string
resources: $Var().allResources
`;

let workingDir: string;
const originalStackInfoMap = deployedStackOverviewManager.stackInfoMap;
const warn = spyOn(tuiManager, 'warn').mockImplementation(() => {});

beforeAll(async () => {
  workingDir = await mkdtemp(join(tmpdir(), 'stacktape-web-build-environment-'));
  await writeFile(join(workingDir, 'stacktape.yml'), config);
  await synthesizeFixture({ configPath: join(workingDir, 'stacktape.yml'), workingDir });
  deployedStackOverviewManager.stackInfoMap = {
    metadata: {},
    customOutputs: {},
    resources: {
      api: {
        resourceType: 'http-api-gateway',
        referencableParams: {
          domain: { value: 'abc123.execute-api.eu-west-1.amazonaws.com' },
          url: { value: DEPLOYED_API_URL }
        }
      }
    }
  } as unknown as typeof originalStackInfoMap;
});

afterEach(() => warn.mockClear());

afterAll(async () => {
  deployedStackOverviewManager.stackInfoMap = originalStackInfoMap;
  warn.mockRestore();
  await rm(workingDir, { recursive: true, force: true });
});

test('variables that read values this deployment adds are left out with a warning; the others are kept', async () => {
  const environment = await resolveWebBuildEnvironment({
    resourceName: 'web',
    environment: [
      { name: 'PLAIN', value: 'kept' },
      { name: 'API_URL', value: "$ResourceParam('api', 'url')" },
      { name: 'API_DOMAIN_URL', value: "$ResourceParam('api', 'customDomainUrl')" },
      { name: 'TABLE', value: "$ResourceParam('records', 'name')" }
    ]
  });

  expect(environment).toEqual([
    { name: 'PLAIN', value: 'kept' },
    { name: 'API_URL', value: DEPLOYED_API_URL }
  ]);
  const warnings = warn.mock.calls.map(([message]) => String(message));
  expect(warnings).toHaveLength(2);
  expect(warnings.find((message) => message.includes('`API_DOMAIN_URL`'))).toContain('customDomainUrl');
  expect(warnings.find((message) => message.includes('`TABLE`'))).toContain('not deployed yet');
});

test('a parameter name the resource type does not have stops the build and lists the valid names', async () => {
  const failure = await resolveWebBuildEnvironment({
    resourceName: 'web',
    environment: [
      { name: 'PLAIN', value: 'kept' },
      { name: 'API_DOMAIN_URL', value: "$ResourceParam('api', 'customDomainUrll')" }
    ]
  }).catch((error: unknown) => error);

  expect(failure).toBeInstanceOf(CliError);
  const { code, message, hints } = failure as CliError;
  expect(code).toBe('DIRECTIVE_RESOURCE_PARAMETER_INVALID');
  expect(message).toContain('Cannot resolve environment variable `API_DOMAIN_URL` for the build of `web`');
  expect(String(hints)).toContain('`customDomainUrl`');
  expect(String(hints)).toContain('`canonicalDomain`');
  expect(warn).not.toHaveBeenCalled();
});
