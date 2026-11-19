import { describe, expect, it } from 'bun:test';
import type { WizardState } from '../session';
import { bestEvidence, quoteLabel, revealPlan, stepDuration, tellingOrder, yamlSegments } from './resource-story';

const YAML = `projectName: shop
region: eu-west-1
resources:
  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: postgres
  databaseBastion:
    type: bastion
  app:
    type: nextjs-web
    properties:
      appDirectory: .
scripts:
  migrate:
    type: local-script
`;

const state = (overrides: Partial<WizardState> = {}): WizardState => ({
  phase: 'reviewing',
  projectName: 'shop',
  timeline: [],
  answers: {},
  facts: {
    services: [
      {
        name: 'app',
        path: '.',
        language: 'typescript',
        framework: 'nextjs',
        exposesHttp: true,
        executionModel: 'long-running',
        source: 'probe',
        evidence: [
          { file: 'package.json', line: 6, quote: '"start":', field: 'startCommand' } as never,
          { file: 'package.json', line: 27, quote: '"next"' }
        ],
        environmentVariables: [
          { name: 'AUTH_SECRET', role: 'third-party-secret' },
          { name: 'STRIPE_SECRET_KEY', role: 'third-party-secret' },
          { name: 'BASE_URL', role: 'runtime-config' }
        ]
      } as never
    ],
    dependencies: [
      { name: 'mainDatabase', kind: 'postgres', consumedBy: ['app'], source: 'probe', evidence: [] },
      { name: 'broker', kind: 'amqp', consumedBy: ['app'], source: 'probe', evidence: [] }
    ],
    existingDeployments: [],
    decisions: []
  },
  composition: {
    resources: {
      mainDatabase: { type: 'relational-database', properties: { engine: { type: 'postgres' } } },
      databaseBastion: { type: 'bastion', properties: {} },
      app: { type: 'nextjs-web', properties: {} }
    },
    provenance: {
      mainDatabase: {
        reason: 'Your code connects to a Postgres database.',
        evidence: [{ file: 'package.json', line: 29, quote: '"postgres"' }]
      },
      app: {
        reason: 'Stacktape has first-class support for Next.js, which handles its build output.',
        evidence: [{ file: 'package.json', line: 6, quote: '"start":' }]
      }
    },
    gaps: [],
    unsetSettings: [],
    deployable: true,
    price: {
      monthly: '$19/mo',
      byResource: { mainDatabase: '$15/mo', databaseBastion: '$3.80/mo', app: 'pay-per-use' },
      region: 'eu-west-1'
    },
    configText: { yaml: YAML }
  },
  ...overrides
});

describe('cutting the file into what the reveal types', () => {
  it('keeps every character, in order', () => {
    const { header, blocks, trailer } = yamlSegments(YAML);
    expect(header + blocks.map((block) => block.text).join('') + trailer).toBe(YAML);
    expect(blocks.map((block) => block.name)).toEqual(['mainDatabase', 'databaseBastion', 'app']);
    expect(header.endsWith('resources:\n')).toBe(true);
    expect(trailer.startsWith('scripts:')).toBe(true);
  });

  it('has no blocks for a file without resources', () => {
    expect(yamlSegments('projectName: x\n')).toEqual({ header: 'projectName: x\n', blocks: [], trailer: '' });
  });
});

describe('the telling order', () => {
  it('puts the app first, then its data, then the rest, keeping the file order within a rank', () => {
    expect(
      tellingOrder({
        mainDatabase: { type: 'relational-database', properties: {} },
        databaseBastion: { type: 'bastion', properties: {} },
        frontend: { type: 'hosting-bucket', properties: {} },
        backend: { type: 'web-service', properties: {} },
        uploads: { type: 'bucket', properties: {} }
      })
    ).toEqual(['backend', 'frontend', 'mainDatabase', 'uploads', 'databaseBastion']);
  });
});

describe('the line that shows why', () => {
  it('prefers the line naming the framework over build details', () => {
    expect(bestEvidence(state(), 'app')).toEqual({ file: 'package.json', line: 27, quote: '"next"' });
  });

  it('uses the composition’s first citation for anything else', () => {
    expect(bestEvidence(state(), 'mainDatabase')).toEqual({ file: 'package.json', line: 29, quote: '"postgres"' });
    expect(bestEvidence(state(), 'databaseBastion')).toBeUndefined();
  });

  it.each([
    ['"postgres"', 'postgres'],
    ['"build":', 'build'],
    ['app = FastAPI(', 'app = FastAPI('],
    ['  image: postgres:18 ', 'image: postgres:18']
  ])('shows %p as %p', (quote, label) => {
    expect(quoteLabel(quote)).toBe(label);
  });
});

describe('the reveal', () => {
  it('tells each resource with its price, and the app with the secrets only the user can supply', () => {
    const plan = revealPlan(state())!;
    expect(plan.steps.map((step) => step.story.name)).toEqual(['app', 'mainDatabase', 'databaseBastion']);
    expect(plan.steps[0]!.story).toMatchObject({
      plainName: 'Next.js app',
      reason: 'Runs your Next.js app, built the way Next.js expects.',
      priceLabel: 'Pay per use',
      monthly: 0
    });
    expect(plan.steps[1]!.story).toMatchObject({ plainName: 'Postgres database', priceLabel: '$15/mo', monthly: 15 });
    expect(plan.steps.flatMap((step) => step.chips.map((chip) => chip.label))).toEqual([
      'Next.js app',
      '2 secrets',
      'Postgres',
      'Database access server',
      'RabbitMQ, not created'
    ]);
  });

  it('is absent until there is a file with resources', () => {
    const { composition: _composition, ...analysing } = state();
    expect(revealPlan({ ...analysing, phase: 'analysing' })).toBeUndefined();
  });

  it.each([
    [1, 1400],
    [4, 1400],
    [8, 1000],
    [20, 700]
  ])('gives %p resources %p ms each', (count, duration) => {
    expect(stepDuration(count)).toBe(duration);
  });
});
