import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import type { HttpRequest } from '@smithy/protocol-http';
import { HttpResponse } from '@smithy/protocol-http';
import { createAwsLoggingPlugin } from './client-instrumentation';
import { assumedRoleIdentityPlugin, getAwsCredentialsIdentity } from './identity';

const ACCOUNT = '123456789012';
const SESSION_ARN = `arn:aws:sts::${ACCOUNT}:assumed-role/Deployer/stacktape-test`;
const ROLE_ID = 'AROAEXAMPLEROLEID:stacktape-test';

/** STS's answer to `AssumeRole`, as the role assumer receives it. */
const assumeRoleResponse = (
  accessKeyId: string
) => `<AssumeRoleResponse xmlns="https://sts.amazonaws.com/doc/2011-06-15/">
  <AssumeRoleResult>
    <Credentials>
      <AccessKeyId>${accessKeyId}</AccessKeyId>
      <SecretAccessKey>secret</SecretAccessKey>
      <SessionToken>token</SessionToken>
      <Expiration>2099-01-01T00:00:00Z</Expiration>
    </Credentials>
    <AssumedRoleUser>
      <Arn>${SESSION_ARN}</Arn>
      <AssumedRoleId>${ROLE_ID}</AssumedRoleId>
    </AssumedRoleUser>
  </AssumeRoleResult>
  <ResponseMetadata><RequestId>request</RequestId></ResponseMetadata>
</AssumeRoleResponse>`;

const previousEnvironment = { ...process.env };
let home: string;

beforeAll(async () => {
  home = await mkdtemp(join(tmpdir(), 'stp-identity-'));
  await writeFile(
    join(home, 'config'),
    '[profile deployer]\nrole_arn = arn:aws:iam::123456789012:role/Deployer\nsource_profile = base\nregion = eu-west-1\n'
  );
  await writeFile(join(home, 'credentials'), '[base]\naws_access_key_id = AKIABASE\naws_secret_access_key = base\n');
  for (const name of ['AWS_PROFILE', 'AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_SESSION_TOKEN']) {
    delete process.env[name];
  }
  Object.assign(process.env, {
    HOME: home,
    AWS_CONFIG_FILE: join(home, 'config'),
    AWS_SHARED_CREDENTIALS_FILE: join(home, 'credentials')
  });
});

afterAll(async () => {
  process.env = previousEnvironment;
  await rm(home, { recursive: true, force: true });
});

describe('the identity of a profile that assumes a role', () => {
  test('comes from the AssumeRole answer, without a GetCallerIdentity call', async () => {
    const requests: string[] = [];
    const requestHandler = {
      handle: async (request: HttpRequest) => {
        requests.push(String(request.body));
        return {
          response: new HttpResponse({
            statusCode: 200,
            headers: { 'content-type': 'text/xml' },
            body: Buffer.from(assumeRoleResponse('ASIASESSIONKEY'))
          })
        };
      }
    };
    // The same provider chain the CLI builds for a local profile.
    const provider = defaultProvider({
      profile: 'deployer',
      clientConfig: { requestHandler },
      clientPlugins: [assumedRoleIdentityPlugin]
    });

    const credentials = await provider();
    const identity = await getAwsCredentialsIdentity({
      credentials,
      region: 'eu-west-1',
      getErrorHandler: (message) => (error) => {
        throw new Error(`${message} ${error.message}`);
      },
      loggingPlugin: createAwsLoggingPlugin({
        printer: { colorize: (_color: string, text: string) => text, debug: () => {} } as never,
        isDebug: () => false
      })
    });

    expect(credentials.accessKeyId).toBe('ASIASESSIONKEY');
    expect(identity).toEqual({ Account: ACCOUNT, Arn: SESSION_ARN, UserId: ROLE_ID });
    expect(requests).toHaveLength(1);
    expect(requests[0]).toContain('Action=AssumeRole');
  });
});
