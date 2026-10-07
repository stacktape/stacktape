/**
 * The wizard, filled with canned data, for working on it without doing anything real.
 *
 * Every screen after the first needs something expensive to reach: an agent run for the questions,
 * a written file for the review, and an actual AWS deploy for the progress view. Iterating on the
 * last one by deploying is neither fast nor free, so this opens a session whose mission, writer and
 * deploy are all fakes that emit the same shapes the real ones do.
 *
 *   bun scripts/init-wizard-fixture.ts               # the deploy, mid-flight
 *   bun scripts/init-wizard-fixture.ts --failed      # the deploy, gone wrong
 *   bun scripts/init-wizard-fixture.ts --signed-out  # the sign-in panel, against a fake account service
 *
 * `--signed-out` starts without a Stacktape account, so the Deploy step shows the sign-in panel. What
 * each input does is printed when the fixture starts; see `fixtureSignIn` below.
 *
 * Development tooling. Nothing here ships, and nothing here talks to AWS or Cognito.
 */

import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';

import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import { startWizardSession } from '../src/init/server/wizard-session';
import { findWizardBundle } from '../src/init/run-init';
import { INIT_TARGET_SCHEMA_VERSION } from '../src/init/deploy/stack-expectation';
import type { SignInFailure, WizardSignInDependencies } from '../src/init/server/wizard-sign-in';
import { oauthCallbackHeaders, renderOAuthCallbackPage } from '../src/commands/_utils/auth/oauth-callback-page';

const failed = process.argv.includes('--failed');
const signedOut = process.argv.includes('--signed-out');

const FIXTURE_PASSWORD = 'password1';
const FIXTURE_CODE = '123456';

const SIGN_IN_CHEAT_SHEET = `
Sign-in fixture. Nothing leaves this machine.
  Continue with Google       opens a stand-in page with "Allow" and "Deny"
  any new email              create account -> code step; the code is ${FIXTURE_CODE}
  taken@example.com          "account exists" on create; signs in with ${FIXTURE_PASSWORD}
  unconfirmed@example.com    sign in (${FIXTURE_PASSWORD}) -> code step
  mfa@example.com            sign in (${FIXTURE_PASSWORD}) -> authenticator step; the code is ${FIXTURE_CODE}
  orgs@example.com           sign in (${FIXTURE_PASSWORD}) -> choose one of three organizations
  sms@example.com            sign in (${FIXTURE_PASSWORD}) -> an unsupported sign-in step
  any other password         "email and password do not match"
`;

/**
 * A stand-in for Cognito, the control plane and the CLI's persisted state.
 *
 * Shaped like the real dependencies and slow enough that every waiting state can be seen. The
 * account check below reads `signedInAs`, the way the real one reads the key `saveApiKey` wrote.
 */
const fixtureSignIn = () => {
  type Account = {
    password: string;
    confirmed: boolean;
    totp?: boolean;
    challenge?: string;
    organizations: string[];
  };
  const canned = (account: Omit<Account, 'password' | 'confirmed'> & { confirmed?: boolean }): Account => ({
    password: FIXTURE_PASSWORD,
    confirmed: true,
    ...account
  });
  const accounts: Record<string, Account> = {
    'taken@example.com': canned({ organizations: ['taken-personal-org'] }),
    'unconfirmed@example.com': canned({ confirmed: false, organizations: ['unconfirmed-personal-org'] }),
    'mfa@example.com': canned({ totp: true, organizations: ['mfa-personal-org'] }),
    'orgs@example.com': canned({ organizations: ['orgs-personal-org', 'Acme', 'Globex Engineering'] }),
    'sms@example.com': canned({ challenge: 'SMS_MFA', organizations: ['sms-personal-org'] })
  };
  let signedInAs: { email: string; organization: string } | undefined;

  const pause = () => new Promise((settle) => setTimeout(settle, 500));
  const failure = (code: SignInFailure['code'], detail?: string): SignInFailure => ({
    ok: false,
    code,
    ...(detail === undefined ? {} : { detail })
  });

  const dependencies: WizardSignInDependencies = {
    startGoogle: async () => {
      let answer: (outcome: { ok: true; idToken: string } | SignInFailure) => void = () => {};
      const completed = new Promise<{ ok: true; idToken: string } | SignInFailure>((settle) => {
        answer = settle;
      });
      // Serves what the real loopback listener serves, so the callback page can be worked on too.
      const google = createServer((request, response) => {
        const nonce = randomBytes(16).toString('base64');
        const url = new URL(request.url ?? '/', 'http://127.0.0.1');
        if (url.pathname !== '/callback') {
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end(
            '<body style="font-family: system-ui; padding: 40px"><h1>Stand-in for Google</h1>' +
              '<p><a href="/callback?outcome=success">Allow</a> &nbsp; <a href="/callback?outcome=failure">Deny</a></p></body>'
          );
          return;
        }
        const allowed = url.searchParams.get('outcome') === 'success';
        response.writeHead(200, oauthCallbackHeaders(nonce));
        response.end(
          renderOAuthCallbackPage(
            allowed
              ? { outcome: 'success', returnTo: 'wizard' }
              : { outcome: 'failure', returnTo: 'wizard', reason: 'access_denied' },
            nonce
          )
        );
        google.close();
        accounts['google@example.com'] ??= canned({ organizations: ['google-personal-org'] });
        answer(allowed ? { ok: true, idToken: 'google@example.com' } : failure('google-failed', 'access_denied'));
      });
      await new Promise<void>((listening) => google.listen(0, '127.0.0.1', () => listening()));
      return {
        ok: true,
        authorizationUrl: `http://127.0.0.1:${(google.address() as AddressInfo).port}/`,
        completed,
        cancel: () => google.close()
      };
    },
    signUp: async ({ email, password }) => {
      await pause();
      if (accounts[email] !== undefined) return failure('account-exists');
      if (password.length < 8) return failure('password-rejected');
      accounts[email] = { password, confirmed: false, organizations: [`${email.split('@')[0]}-personal-org`] };
      return { ok: true, confirmed: false };
    },
    confirmSignUp: async ({ email, code }) => {
      await pause();
      if (code !== FIXTURE_CODE) return failure('code-mismatch');
      accounts[email]!.confirmed = true;
      return { ok: true };
    },
    resendCode: async () => {
      await pause();
      return { ok: true };
    },
    signIn: async ({ email, password }) => {
      await pause();
      const account = accounts[email];
      if (account === undefined || account.password !== password) return failure('invalid-credentials');
      if (!account.confirmed) return { ok: true, next: 'confirm-email' };
      if (account.challenge !== undefined) return failure('unsupported-challenge', account.challenge);
      if (account.totp === true) return { ok: true, next: 'mfa', challenge: { username: email, session: 'fixture' } };
      return { ok: true, next: 'authenticated', idToken: email };
    },
    answerMfa: async ({ username, code }) => {
      await pause();
      return code === FIXTURE_CODE ? { ok: true, idToken: username } : failure('mfa-code-mismatch');
    },
    exchange: async (email) => {
      await pause();
      const organizations = accounts[email]?.organizations ?? [];
      const issue = (organization: string) => {
        signedInAs = { email, organization };
        return { ok: true as const, apiKey: 'fixture' };
      };
      if (organizations.length === 0) return failure('exchange-failed', 'No organization found.');
      if (organizations.length === 1) return issue(organizations[0]!);
      return {
        ok: true,
        organizations: organizations.map((name) => ({ id: name, name })),
        choose: async (organizationId) => {
          await pause();
          return issue(organizationId);
        }
      };
    },
    saveApiKey: async () => {}
  };

  return {
    dependencies,
    stacktapeAccount: async () => {
      await pause();
      return signedInAs === undefined
        ? { signedIn: false, detail: 'Not signed in.' }
        : { signedIn: true, detail: 'Signed in for the local fixture.', ...signedInAs };
    }
  };
};

const facts = projectFactsSchema.parse({
  schemaVersion: PROJECT_FACTS_SCHEMA_VERSION,
  services: [
    {
      name: 'api',
      path: '.',
      language: 'javascript',
      framework: 'express',
      exposesHttp: true,
      port: 3000,
      executionModel: 'long-running',
      startCommand: 'node index.js',
      evidence: [{ file: 'package.json', line: 7, quote: '"start": "node index.js"' }],
      source: 'probe'
    }
  ],
  dependencies: [
    {
      name: 'cache',
      kind: 'redis',
      extensions: [],
      consumedBy: ['api'],
      evidence: [{ file: 'package.json', line: 13, quote: '"ioredis": "^5.3.2"' }],
      source: 'probe'
    }
  ]
});

/** The event stream a real deploy produces, in the order and shapes the CLI emits them. */
const CANNED_EVENTS = [
  { type: 'event', phase: 'INITIALIZE', eventType: 'LOAD_CONFIG', status: 'started', message: 'Loading stacktape.yml' },
  {
    type: 'event',
    phase: 'INITIALIZE',
    eventType: 'LOAD_AWS_CREDENTIALS',
    status: 'completed',
    message: 'Using profile default'
  },
  { type: 'event', phase: 'BUILD_AND_PACKAGE', eventType: 'BUILD_CODE', status: 'started', message: 'Building api' },
  { type: 'output', eventType: 'BUILD_CODE', lines: ['> npm run build', 'built in 1.2s'] },
  {
    type: 'event',
    phase: 'UPLOAD',
    eventType: 'UPLOAD_ARTIFACTS',
    status: 'completed',
    message: 'Uploaded 2 artifacts'
  },
  {
    type: 'log',
    level: 'warn',
    source: 'cli',
    message: 'Redis in a single availability zone. Fine for dev, not for production.'
  },
  {
    type: 'event',
    phase: 'DEPLOY',
    eventType: 'UPDATE_STACK',
    status: 'running',
    message: 'Creating resources',
    detail: {
      kind: 'cloudformation-progress',
      stackAction: 'create',
      percent: 46,
      completedCount: 11,
      totalPlanned: 24,
      inProgressResources: ['ApiEcsService', 'CacheReplicationGroup', 'ApiLoadBalancer'],
      changeCounts: { created: 24, updated: 0, deleted: 0 }
    }
  }
];

const FAILURE_EVENTS = [
  {
    type: 'log',
    level: 'error',
    source: 'cli',
    message: 'CacheReplicationGroup: CREATE_FAILED — cache.t4g.micro is not available in eu-west-1c'
  },
  { type: 'result', ok: false, code: 'DEPLOY_FAILED', message: 'The stack was rolled back.' }
];

const start = async () => {
  const signIn = signedOut ? fixtureSignIn() : undefined;
  const session = await startWizardSession({
    projectName: 'stacktape-init-demo',
    repositoryPath: process.cwd(),
    result: { facts, composition: composeConfig({ facts, projectName: 'demo' }), verification: [], completeness: [] },
    write: async () => ({ path: `${process.cwd()}/stacktape.yml`, filename: 'stacktape.yml' }),
    awsIdentity: async () => ({
      available: true,
      accountId: '123456789012',
      arn: 'arn:aws:iam::123456789012:user/fixture',
      region: 'eu-west-1'
    }),
    ...(signIn === undefined
      ? { stacktapeAccount: async () => ({ signedIn: true, detail: 'Signed in for the local fixture.' }) }
      : { stacktapeAccount: signIn.stacktapeAccount, signIn: signIn.dependencies }),
    gitHost: 'github',
    writePipeline: async () => ({
      filename: '.github/workflows/deploy.yml',
      host: 'github',
      authSummary: 'Assumes an IAM role through GitHub’s OIDC provider, so no AWS key is stored in your repository.',
      requiredSecrets: [{ name: 'AWS_DEPLOY_ROLE_ARN', description: 'ARN of an IAM role your repository may assume.' }]
    }),
    inspectDeployTarget: async ({ stage, region }) => ({
      schemaVersion: INIT_TARGET_SCHEMA_VERSION,
      status: 'absent',
      accountId: '123456789012',
      stackName: `stacktape-init-demo-${stage}`,
      projectName: 'stacktape-init-demo',
      stage,
      region,
      configSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    }),
    deploy: async ({ onEvent, onCommand }) => {
      onCommand('stacktape deploy --configPath stacktape.yml --stage dev --region eu-west-1');
      for (const event of CANNED_EVENTS) {
        onEvent(event);
        // Paced like a real deploy so the progress view can be watched rather than only inspected.
        await new Promise((settle) => setTimeout(settle, 700));
      }
      if (!failed) {
        return { ok: true, code: 'OK', message: 'Deployed.' };
      }
      for (const event of FAILURE_EVENTS) {
        onEvent(event);
        await new Promise((settle) => setTimeout(settle, 400));
      }
      return { ok: false, code: 'DEPLOY_FAILED', message: 'The stack was rolled back.' };
    },
    ...(findWizardBundle() === undefined ? {} : { staticRoot: findWizardBundle()! }),
    watchStatic: true
  });

  process.stdout.write(`
Wizard fixture (${failed ? 'failing' : 'succeeding'} deploy${signedOut ? ', signed out' : ''}): ${session.server.url}
${signedOut ? SIGN_IN_CHEAT_SHEET : ''}`);
  process.on('SIGINT', () => void session.close().then(() => process.exit(0)));
};

// Not top-level `await`: this file belongs to the CLI's TypeScript project, whose target predates it.
void start();
