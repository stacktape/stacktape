/**
 * The wizard, filled with canned data, for working on it without doing anything real.
 *
 * Every screen after the first needs something expensive to reach: an agent run for the questions,
 * a written file for the review, and an actual AWS deploy for the progress view. Iterating on the
 * last one by deploying is neither fast nor free, so this opens a session whose mission, writer and
 * deploy are all fakes that emit the same shapes the real ones do.
 *
 *   bun scripts/init-wizard-fixture.ts            # the deploy, mid-flight
 *   bun scripts/init-wizard-fixture.ts --failed   # the deploy, gone wrong
 *
 * Development tooling. Nothing here ships, and nothing here talks to AWS.
 */

import { composeConfig } from '@stacktape/config-inference/compose';
import { PROJECT_FACTS_SCHEMA_VERSION, projectFactsSchema } from '@stacktape/config-inference/facts';
import { startWizardSession } from '../src/init/server/wizard-session';
import { findWizardBundle } from '../src/init/run-init';

const failed = process.argv.includes('--failed');

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
    stacktapeAccount: async () => ({ signedIn: true, detail: 'Signed in for the local fixture.' }),
    gitHost: 'github',
    writePipeline: async () => ({
      filename: '.github/workflows/deploy.yml',
      host: 'github',
      authSummary: 'Assumes an IAM role through GitHub’s OIDC provider, so no AWS key is stored in your repository.',
      requiredSecrets: [{ name: 'AWS_DEPLOY_ROLE_ARN', description: 'ARN of an IAM role your repository may assume.' }]
    }),
    inspectDeployTarget: async ({ stage, region }) => ({
      schemaVersion: 'stacktape.init-target.v1',
      status: 'absent',
      accountId: '123456789012',
      stackName: `stacktape-init-demo-${stage}`,
      projectName: 'stacktape-init-demo',
      stage,
      region
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
Wizard fixture (${failed ? 'failing' : 'succeeding'} deploy): ${session.server.url}
`);
  process.on('SIGINT', () => void session.close().then(() => process.exit(0)));
};

// Not top-level `await`: this file belongs to the CLI's TypeScript project, whose target predates it.
void start();
