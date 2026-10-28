import { afterAll, beforeAll, expect, test } from 'bun:test';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stackMetadataNames } from '@stacktape/naming/stack-metadata-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { getLambdaEnvVars } from './deployed-function-environment';
import { getDevAgentCredentials, initDevAgentCredentials } from './dev-agent-credentials';

// r2rr bug hunt, finding 3: the agent read deployed functions and assumed its scoped role with the ambient AWS
// credential chain instead of the credentials the CLI selected, and fell back to the developer's own credentials when
// the role could not be assumed. A loopback endpoint stands in for Lambda and STS and records which access key signed
// each request; the test preload sets a different, ambient access key.

const SELECTED = { accessKeyId: 'AKIASELECTEDDEVELOPER', secretAccessKey: 'selected-secret' };
const ROLE_ARN = 'arn:aws:iam::111111111111:role/shop-dev-dev-agent';
const signedBy: string[] = [];
/** How many more AssumeRole calls STS refuses. */
let assumeRoleRefusals = 0;
let server: Server;

const readBody = async (request: IncomingMessage) => {
  let body = '';
  for await (const chunk of request) body += chunk;
  return body;
};

beforeAll(async () => {
  server = createServer(async (request, response) => {
    const body = await readBody(request);
    signedBy.push(/Credential=([^/]+)\//.exec(request.headers.authorization ?? '')?.[1] ?? 'unsigned');
    if (request.url?.startsWith('/2015-03-31/functions/shop-dev-api/configuration')) {
      response.setHeader('content-type', 'application/json');
      response.end(
        JSON.stringify({ FunctionName: 'shop-dev-api', Environment: { Variables: { TARGET: 'selected' } } })
      );
      return;
    }
    if (request.url?.startsWith('/2015-03-31/functions/')) {
      response.statusCode = 404;
      response.setHeader('x-amzn-errortype', 'ResourceNotFoundException');
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ Type: 'User', Message: 'Function not found' }));
      return;
    }
    const params = new URLSearchParams(body);
    response.setHeader('content-type', 'text/xml');
    if (
      params.get('Action') !== 'AssumeRole' ||
      params.get('ExternalId') !== 'stack-hash' ||
      assumeRoleRefusals-- > 0
    ) {
      response.statusCode = 403;
      response.end(
        '<ErrorResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><Error><Type>Sender</Type><Code>AccessDenied</Code>' +
          '<Message>not authorized to perform sts:AssumeRole</Message></Error><RequestId>1</RequestId></ErrorResponse>'
      );
      return;
    }
    response.end(
      '<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/"><AssumeRoleResult><Credentials>' +
        '<AccessKeyId>ASIADEVAGENTROLE</AccessKeyId><SecretAccessKey>role-secret</SecretAccessKey>' +
        '<SessionToken>role-token</SessionToken><Expiration>2099-01-01T00:00:00Z</Expiration></Credentials>' +
        `<AssumedRoleUser><Arn>${ROLE_ARN.replace(':iam:', ':sts:').replace(':role/', ':assumed-role/')}/agent</Arn>` +
        '<AssumedRoleId>AROAROLE:agent</AssumedRoleId></AssumedRoleUser></AssumeRoleResult>' +
        '<ResponseMetadata><RequestId>2</RequestId></ResponseMetadata></AssumeRoleResponse>'
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  awsSdkManager.init({
    credentials: SELECTED,
    region: 'eu-west-1',
    endpoint: `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  });
  globalStateManager.targetStack = { stackName: 'shop-dev', projectName: 'shop', stage: 'dev' } as never;
  Object.defineProperty(deployedStackOverviewManager, 'stackInfoMap', {
    configurable: true,
    value: {
      customOutputs: { DevAgentRoleArn: ROLE_ARN },
      metadata: { [stackMetadataNames.devAgentRoleExternalId()]: { value: 'stack-hash' } }
    }
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

test("a deployed function's environment is read with the selected credentials", async () => {
  signedBy.length = 0;
  expect(await getLambdaEnvVars('api')).toEqual({ TARGET: 'selected' });
  expect(await getLambdaEnvVars('missing')).toBeNull();
  expect(signedBy).toEqual([SELECTED.accessKeyId, SELECTED.accessKeyId]);
});

test('the dev agent role is assumed with the selected credentials, and a denied role never falls back to them', async () => {
  signedBy.length = 0;
  assumeRoleRefusals = Number.POSITIVE_INFINITY;
  expect(initDevAgentCredentials()).toBe(true);
  const denied = await getDevAgentCredentials({ retryForMs: 1200 }).then(
    (credentials) => `got ${credentials.accessKeyId}`,
    (error: Error) => error.message
  );
  expect(denied).toContain(`could not assume the dev agent role ${ROLE_ARN}`);
  expect(denied).toContain('does not fall back to your own AWS credentials');
  expect(signedBy.length).toBeGreaterThan(0);
  expect(new Set(signedBy)).toEqual(new Set([SELECTED.accessKeyId]));

  // A refusal that outlasted the retries is final for the session: the next call fails at once.
  const started = Date.now();
  await expect(getDevAgentCredentials()).rejects.toThrow('could not assume');
  expect(Date.now() - started).toBeLessThan(1000);

  // Right after the dev stack created the role, IAM refuses it for a few seconds; the agent keeps asking.
  expect(initDevAgentCredentials()).toBe(true);
  assumeRoleRefusals = 2;
  expect((await getDevAgentCredentials()).accessKeyId).toBe('ASIADEVAGENTROLE');
  expect(assumeRoleRefusals).toBe(-1);
});

test('a dev stack without the role gives the agent no AWS credentials at all', async () => {
  Object.defineProperty(deployedStackOverviewManager, 'stackInfoMap', {
    configurable: true,
    value: { customOutputs: {} }
  });
  expect(initDevAgentCredentials()).toBe(false);
  await expect(getDevAgentCredentials()).rejects.toThrow('has no dev agent role');
});
