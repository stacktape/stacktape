import { afterEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CliError } from '@utils/errors';
import {
  detectLocalAwsSelectors,
  ignoredProfileNotice,
  matchConnectedAwsAccount,
  parseAwsIniSections,
  readAwsProfileSections,
  resolveLocalAwsAccount,
  type AwsProfileSections,
  type LocalAwsAccountSources
} from './local-aws-account';

const PRODUCTION = '222222222222';
const DEV = '111111111111';
const E2E = '333333333333';

/** Fake STS: answers per profile or for the environment keys, and records every call. */
const fakeSources = ({
  profiles = {},
  profileAccounts = {},
  environmentAccount,
  failure
}: {
  profiles?: Record<string, AwsProfileSections>;
  profileAccounts?: Record<string, string>;
  environmentAccount?: string;
  failure?: Error | 'hang';
}) => {
  const stsCalls: string[] = [];
  const answer = (caller: string, account: string | undefined) => {
    stsCalls.push(caller);
    if (failure === 'hang') return new Promise<string>(() => undefined);
    if (failure) return Promise.reject(failure);
    return account ? Promise.resolve(account) : Promise.reject(new Error(`no fake STS answer for ${caller}`));
  };
  const sources: LocalAwsAccountSources = {
    readProfile: async (profile) => profiles[profile] ?? {},
    profileCallerAccount: (profile) => answer(`profile:${profile}`, profileAccounts[profile]),
    environmentCallerAccount: () => answer('environment', environmentAccount)
  };
  return { sources, stsCalls };
};

const failure = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (error) {
    if (error instanceof CliError) return error;
    throw error;
  }
  throw new Error('Expected the promise to reject.');
};

const profileSelector = (profile: string) => detectLocalAwsSelectors({ environment: { AWS_PROFILE: profile } });

describe('detectLocalAwsSelectors', () => {
  test.each([
    [
      '--profile wins over AWS_PROFILE',
      { requestedProfile: 'cli', environment: { AWS_PROFILE: 'env' } },
      '--profile cli'
    ],
    ['AWS_PROFILE without --profile', { environment: { AWS_PROFILE: 'env' } }, 'AWS_PROFILE=env'],
    ['nothing selected', { environment: {} }, undefined]
  ])('%s', (_, input, label) => {
    expect(detectLocalAwsSelectors(input).profile?.label).toBe(label);
  });

  test('reports environment keys next to a profile, so a disagreement can be detected', () => {
    const selectors = detectLocalAwsSelectors({ environment: { AWS_PROFILE: 'dev', AWS_ACCESS_KEY_ID: 'AKIA' } });
    expect(selectors.profile?.profile).toBe('dev');
    expect(selectors.environmentKeys?.label).toBe('AWS_ACCESS_KEY_ID');
  });
});

describe('resolveLocalAwsAccount', () => {
  test('returns nothing and asks nobody when no local credentials are selected', async () => {
    const { sources, stsCalls } = fakeSources({});
    expect(await resolveLocalAwsAccount({ selectors: detectLocalAwsSelectors({ environment: {} }), sources })).toBe(
      undefined
    );
    expect(stsCalls).toEqual([]);
  });

  test.each([
    ['an SSO profile', { sso_account_id: DEV, sso_role_name: 'Admin', sso_session: 'corp' }],
    ['a role profile', { role_arn: `arn:aws:iam::${DEV}:role/deploy`, source_profile: 'base' }]
  ])('reads the account of %s from config without calling STS', async (_, config) => {
    const { sources, stsCalls } = fakeSources({ profiles: { dev: { config } } });
    const account = await resolveLocalAwsAccount({ selectors: profileSelector('dev'), sources });
    expect(account).toEqual({ accountId: DEV, selector: expect.objectContaining({ label: 'AWS_PROFILE=dev' }) });
    expect(stsCalls).toEqual([]);
  });

  test('calls STS once for a profile with keys and no account in its config', async () => {
    const { sources, stsCalls } = fakeSources({
      profiles: { e2e: { credentials: { aws_access_key_id: 'AKIA', aws_secret_access_key: 'secret' } } },
      profileAccounts: { e2e: E2E }
    });
    expect((await resolveLocalAwsAccount({ selectors: profileSelector('e2e'), sources }))?.accountId).toBe(E2E);
    expect(stsCalls).toEqual(['profile:e2e']);
  });

  test('fails for a profile that exists in neither file', async () => {
    const { sources, stsCalls } = fakeSources({});
    const error = await failure(resolveLocalAwsAccount({ selectors: profileSelector('typo'), sources }));
    expect(error.code).toBe('LOCAL_AWS_PROFILE_NOT_FOUND');
    expect(error.message).toBe('AWS profile "typo" (AWS_PROFILE=typo) does not exist.');
    expect(stsCalls).toEqual([]);
  });

  test('fails closed with the SSO login command when an SSO session has expired', async () => {
    const { sources } = fakeSources({
      profiles: { dev: { config: { sso_session: 'corp', role_arn: 'not-an-arn' } } },
      failure: new Error('The SSO session associated with this profile has expired.')
    });
    const error = await failure(
      resolveLocalAwsAccount({
        selectors: detectLocalAwsSelectors({ requestedProfile: 'dev', environment: {} }),
        sources
      })
    );
    expect(error.code).toBe('LOCAL_AWS_ACCOUNT_UNRESOLVED');
    expect(error.message).toBe(
      'Could not find the AWS account of --profile dev: The SSO session associated with this profile has expired.'
    );
    expect(error.hints).toEqual(['Run "aws sso login --profile dev", or pass --awsAccount <name>.']);
  });

  test('fails closed when the profile keys are rejected', async () => {
    const { sources } = fakeSources({
      profiles: { e2e: { credentials: { aws_access_key_id: 'AKIA' } } },
      failure: new Error('The security token included in the request is invalid.')
    });
    const error = await failure(resolveLocalAwsAccount({ selectors: profileSelector('e2e'), sources }));
    expect(error.code).toBe('LOCAL_AWS_ACCOUNT_UNRESOLVED');
    expect(error.hints).toEqual([
      'Check the credentials of profile "e2e", unset AWS_PROFILE, or pass --awsAccount <name>.'
    ]);
  });

  test('fails closed when STS does not answer in time', async () => {
    const { sources } = fakeSources({ profiles: { e2e: { credentials: {} } }, failure: 'hang' });
    const error = await failure(resolveLocalAwsAccount({ selectors: profileSelector('e2e'), sources, timeoutMs: 20 }));
    expect(error.code).toBe('LOCAL_AWS_ACCOUNT_UNRESOLVED');
    expect(error.message).toContain('AWS did not answer within 0.02 seconds');
  });

  test('resolves environment keys with one STS call', async () => {
    const { sources, stsCalls } = fakeSources({ environmentAccount: E2E });
    const selectors = detectLocalAwsSelectors({ environment: { AWS_ACCESS_KEY_ID: 'AKIA' } });
    expect(await resolveLocalAwsAccount({ selectors, sources })).toEqual({
      accountId: E2E,
      selector: expect.objectContaining({ label: 'AWS_ACCESS_KEY_ID' })
    });
    expect(stsCalls).toEqual(['environment']);
  });

  test('fails closed when environment keys are rejected, without suggesting --awsAccount', async () => {
    const { sources } = fakeSources({ failure: new Error('AWS_SECRET_ACCESS_KEY is not set') });
    const selectors = detectLocalAwsSelectors({ environment: { AWS_ACCESS_KEY_ID: 'AKIA' } });
    const error = await failure(resolveLocalAwsAccount({ selectors, sources }));
    expect(error.message).toBe(
      'Could not find the AWS account of AWS_ACCESS_KEY_ID: AWS_SECRET_ACCESS_KEY is not set.'
    );
    expect(error.hints).toEqual([
      'Check AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or unset AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.'
    ]);
  });

  test('uses the profile when it and the environment keys belong to the same account', async () => {
    const { sources } = fakeSources({
      profiles: { dev: { config: { sso_account_id: DEV } } },
      environmentAccount: DEV
    });
    const selectors = detectLocalAwsSelectors({ environment: { AWS_PROFILE: 'dev', AWS_ACCESS_KEY_ID: 'AKIA' } });
    expect((await resolveLocalAwsAccount({ selectors, sources }))?.selector.label).toBe('AWS_PROFILE=dev');
  });

  test('refuses a profile and environment keys that belong to different accounts', async () => {
    const { sources } = fakeSources({
      profiles: { dev: { config: { sso_account_id: DEV } } },
      environmentAccount: E2E
    });
    const selectors = detectLocalAwsSelectors({ environment: { AWS_PROFILE: 'dev', AWS_ACCESS_KEY_ID: 'AKIA' } });
    const error = await failure(resolveLocalAwsAccount({ selectors, sources }));
    expect(error.code).toBe('LOCAL_AWS_CREDENTIALS_CONFLICT');
    expect(error.message).toBe(
      `AWS_PROFILE=dev belongs to AWS account ${DEV}, but AWS_ACCESS_KEY_ID belongs to ${E2E}.`
    );
  });
});

describe('matchConnectedAwsAccount', () => {
  const connectedAwsAccounts = [
    { name: 'production', awsAccountId: PRODUCTION },
    { name: 'dev', awsAccountId: DEV }
  ];
  const profile = profileSelector('e2e').profile!;
  const keys = detectLocalAwsSelectors({ environment: { AWS_ACCESS_KEY_ID: 'AKIA' } }).environmentKeys!;

  test('returns the one connected account with the same ID', () => {
    expect(
      matchConnectedAwsAccount({
        localAccount: { accountId: DEV, selector: profile },
        connectedAwsAccounts,
        organizationName: 'Acme'
      }).name
    ).toBe('dev');
  });

  test('refuses an account that is not connected and lists the connected ones', () => {
    let error: CliError | undefined;
    try {
      matchConnectedAwsAccount({
        localAccount: { accountId: E2E, selector: profile },
        connectedAwsAccounts,
        organizationName: 'Acme'
      });
    } catch (caught) {
      error = caught as CliError;
    }
    expect(error?.code).toBe('LOCAL_AWS_ACCOUNT_NOT_CONNECTED');
    expect(error?.message).toBe(
      `AWS_PROFILE=e2e belongs to AWS account ${E2E}, which is not connected to organization "Acme".`
    );
    expect(error?.hints).toEqual([
      `Connected accounts: production (${PRODUCTION}), dev (${DEV}).`,
      `To fix it, unset AWS_PROFILE, pass --awsAccount <name>, or connect account ${E2E} in the Stacktape Console.`
    ]);
  });

  test('does not suggest --awsAccount for environment keys, which still supply the credentials', () => {
    expect(() =>
      matchConnectedAwsAccount({
        localAccount: { accountId: E2E, selector: keys },
        connectedAwsAccounts,
        organizationName: 'Acme'
      })
    ).toThrow(
      expect.objectContaining({
        hints: [
          `Connected accounts: production (${PRODUCTION}), dev (${DEV}).`,
          `To fix it, unset AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or connect account ${E2E} in the Stacktape Console.`
        ]
      })
    );
  });

  test('requires --awsAccount when several connections share the account ID', () => {
    expect(() =>
      matchConnectedAwsAccount({
        localAccount: { accountId: DEV, selector: profile },
        connectedAwsAccounts: [...connectedAwsAccounts, { name: 'dev-again', awsAccountId: DEV }],
        organizationName: 'Acme'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'LOCAL_AWS_ACCOUNT_AMBIGUOUS',
        message: `AWS account ${DEV} (from AWS_PROFILE=e2e) is connected more than once: dev, dev-again.`,
        hints: ['Pass --awsAccount <name>.']
      })
    );
  });
});

describe('ignoredProfileNotice', () => {
  const production = { name: 'production', awsAccountId: PRODUCTION, connectionMode: 'PRIVILEGED' as const };
  const basic = { ...production, connectionMode: 'BASIC' as const };

  test.each([
    ['a profile overridden by --awsAccount', { AWS_PROFILE: 'dev' }, production, true],
    ['a profile that still supplies the credentials of a basic connection', { AWS_PROFILE: 'dev' }, basic, false],
    [
      'a profile next to environment keys, which supply the credentials',
      { AWS_PROFILE: 'dev', AWS_ACCESS_KEY_ID: 'AKIA' },
      basic,
      true
    ],
    ['environment keys alone, which supply the credentials', { AWS_ACCESS_KEY_ID: 'AKIA' }, production, false]
  ])('%s', (_, environment, account, shown) => {
    const notice = ignoredProfileNotice({ selectors: detectLocalAwsSelectors({ environment }), account });
    expect(notice).toBe(
      shown ? `AWS_PROFILE=dev is ignored: --awsAccount selects "production" (${PRODUCTION}).` : undefined
    );
  });
});

describe('readAwsProfileSections', () => {
  const directories: string[] = [];
  afterEach(async () => {
    await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
  });

  test('reads the files the AWS SDK reads, including dotted profile names and nested settings', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'stacktape-aws-profile-'));
    directories.push(directory);
    await writeFile(
      join(directory, 'config'),
      [
        '# comment',
        '[default]',
        'region = eu-west-1',
        '[profile team.dev]',
        `sso_account_id = ${DEV}`,
        's3 =',
        '  max_concurrent_requests = 20',
        '[sso-session corp]',
        'sso_start_url = https://example.awsapps.com/start'
      ].join('\n')
    );
    await writeFile(
      join(directory, 'credentials'),
      '[e2e]\naws_access_key_id = AKIA\naws_secret_access_key = secret\n'
    );
    const environment = {
      AWS_CONFIG_FILE: join(directory, 'config'),
      AWS_SHARED_CREDENTIALS_FILE: join(directory, 'credentials')
    };

    expect(await readAwsProfileSections('team.dev', environment)).toEqual({
      config: { sso_account_id: DEV, s3: '' },
      credentials: undefined
    });
    expect((await readAwsProfileSections('e2e', environment)).credentials).toEqual({
      aws_access_key_id: 'AKIA',
      aws_secret_access_key: 'secret'
    });
    expect((await readAwsProfileSections('default', environment)).config).toEqual({ region: 'eu-west-1' });
    expect(await readAwsProfileSections('missing', environment)).toEqual({ config: undefined, credentials: undefined });
  });

  test('treats missing files as empty', async () => {
    const missing = join(tmpdir(), 'stacktape-no-such-aws-directory');
    expect(
      await readAwsProfileSections('dev', {
        AWS_CONFIG_FILE: join(missing, 'config'),
        AWS_SHARED_CREDENTIALS_FILE: join(missing, 'credentials')
      })
    ).toEqual({ config: undefined, credentials: undefined });
  });

  test('keeps the last value of a repeated key and ignores lines before the first section', () => {
    expect(parseAwsIniSections('stray = 1\n[profile dev]\nregion = a\nregion = b\n')).toEqual({
      'profile dev': { region: 'b' }
    });
  });
});
