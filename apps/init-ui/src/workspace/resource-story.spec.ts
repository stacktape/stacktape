import { describe, expect, it } from 'bun:test';
import type { WizardState } from '../session';
import {
  bestEvidence,
  citationOf,
  evidenceSays,
  locate,
  quoteLabel,
  quotedOn,
  revealPlan,
  runningPrice,
  stepDuration,
  storyOf,
  tellingOrder,
  yamlSegments
} from './resource-story';

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

describe('checking a citation against its file', () => {
  const GO_MOD = [
    'module github.com/evrone/go-clean-template',
    '',
    'require (',
    '\tgithub.com/exaring/otelpgx v0.11.1',
    '\tgithub.com/jackc/pgx/v5 v5.10.0',
    ')'
  ];
  const PRISMA = [
    'generator client {',
    '  provider        = "prisma-client-js"',
    '}',
    '',
    'datasource db {',
    '  provider = "sqlite"',
    '  url      = env("DATABASE_URL")',
    '}'
  ];

  it.each([
    ['pgx', 'github.com/jackc/pgx/v5 v5.10.0', true],
    ['pgx', 'github.com/exaring/otelpgx v0.11.1', false],
    ['"postgres"', '    "postgres": "^3.4.5",', true],
    ['provider        =', '  provider = "sqlite"', true],
    ['url      = env(', '  url      = env("DATABASE_URL")', true],
    ['app:', '  webapp:', false]
  ])('finds %p in %p: %p', (quote, line, expected) => {
    expect(quotedOn(line, quote)).toBe(expected);
  });

  it('moves a citation to the line that says it as a word, nearest first', () => {
    expect(locate(GO_MOD, { file: 'go.mod', line: 4, quote: 'pgx' })).toBe(5);
  });

  it('keeps a citation whose line says it', () => {
    expect(locate(PRISMA, { file: 'schema.prisma', line: 7, quote: 'url      = env(' })).toBe(7);
  });

  it('prefers the line with the hint when the quote is on several', () => {
    expect(locate(PRISMA, { file: 'schema.prisma', line: 2, quote: 'provider        =' }, 'sqlite')).toBe(6);
    expect(locate(PRISMA, { file: 'schema.prisma', line: 2, quote: 'provider        =' })).toBe(2);
  });

  it('keeps the cited line when the quote is nowhere in the file', () => {
    expect(locate(GO_MOD, { file: 'go.mod', line: 3, quote: 'lib/pq' })).toBe(3);
  });

  it('lights cited lines next to the main one together, with their text', () => {
    const story = {
      name: 'sqliteData',
      type: 'efs-filesystem',
      plainName: 'Persistent disk',
      hint: 'sqlite',
      evidence: { file: 'prisma/schema.prisma', line: 7, quote: 'url      = env(' },
      citations: [
        { file: 'prisma/schema.prisma', line: 7, quote: 'url      = env(' },
        { file: 'prisma/schema.prisma', line: 2, quote: 'provider        =' },
        { file: '.env.example', line: 3, quote: 'DATABASE_URL=' }
      ]
    };
    story.evidence = story.citations[0]!;
    const file = {
      path: 'prisma/schema.prisma',
      status: 'shown' as const,
      text: PRISMA.join('\n'),
      lineCount: PRISMA.length,
      truncated: false,
      masked: false
    };
    expect(citationOf(story, file)).toEqual({
      file: 'prisma/schema.prisma',
      line: 7,
      lines: [6, 7],
      text: ['provider = "sqlite"', 'url      = env("DATABASE_URL")']
    });
    expect(citationOf(story, undefined)).toBeUndefined();
  });

  it('knows the dependency a resource stands for, and the resources Stacktape adds for another', () => {
    const shop = state();
    expect(storyOf(shop, 'app', shop.composition!.resources.app!).hint).toBe('next');
    expect(storyOf(shop, 'databaseBastion', shop.composition!.resources.databaseBastion!).designChoice).toBeUndefined();
    const withBastion = state({
      composition: {
        ...shop.composition!,
        provenance: {
          ...shop.composition!.provenance,
          databaseBastion: {
            reason: 'A jump box.',
            evidence: [{ file: 'package.json', line: 29, quote: '"postgres"' }]
          }
        }
      }
    });
    expect(
      storyOf(withBastion, 'databaseBastion', withBastion.composition!.resources.databaseBastion!).designChoice
    ).toBe('so you can reach the private database');
  });
});

describe('the price while the file is written', () => {
  it.each([
    [[], 'estimating…'],
    [[{ priceLabel: 'Pay per use', monthly: 0 }], 'Pay per use'],
    [[{ priceLabel: 'Pay per use', monthly: 0 }, {}], 'estimating…'],
    [
      [
        { priceLabel: 'Pay per use', monthly: 0 },
        { priceLabel: '$15/mo', monthly: 15.33 }
      ],
      '$15 /month estimated AWS cost + usage'
    ],
    [
      [
        { priceLabel: '$18/mo', monthly: 18.07 },
        { priceLabel: '$15/mo', monthly: 15.33 }
      ],
      '$33 /month estimated AWS cost'
    ]
  ])('says %j as %p', (written, text) => {
    expect(runningPrice(written).text).toBe(text);
  });

  it("ends on the estimate's own total, as Review's bar says it, not on a sum of rounded parts", () => {
    const parts = [
      { priceLabel: '$31/mo', monthly: 30.66 },
      { priceLabel: '$18/mo', monthly: 18.07 },
      { priceLabel: '$3.80/mo', monthly: 3.8 }
    ];
    expect(runningPrice(parts, '$52.53/mo + pay-per-use costs')).toEqual({
      text: '$52.53 /month estimated AWS cost + usage',
      amount: 52.53
    });
    expect(runningPrice(parts, '$31/mo')).toEqual({ text: '$31 /month estimated AWS cost', amount: 31 });
    // A total that is not an amount leaves the running sum.
    expect(runningPrice(parts, 'pay-per-use costs').text).toBe('$53 /month estimated AWS cost');
  });
});

const data = (technology: string, type = 'relational-database') => ({ type, technology, hint: 'postgres' });
const app = (technology: string, hint: string) => ({ type: 'web-service', technology, hint });

describe('what the evidence shows, in plain words', () => {
  it.each([
    [data('Postgres'), { file: 'package.json', line: 29, quote: '"postgres"' }, 'Postgres driver'],
    [data('Postgres'), { file: 'go.mod', line: 22, quote: 'pgx' }, 'Postgres driver'],
    [data('Postgres'), { file: 'compose.yml', line: 4, quote: 'image: postgres:18' }, 'Postgres container'],
    [data('Postgres'), { file: 'deploy/docker-compose.yml', line: 52, quote: 'image: postgres' }, 'Postgres container'],
    [data('Postgres'), { file: '.env.example', line: 3, quote: 'POSTGRES_URL=' }, '`POSTGRES_URL` setting'],
    [
      { type: 'efs-filesystem', technology: 'SQLite', hint: 'sqlite' },
      { file: 'prisma/schema.prisma', line: 6, quote: 'provider        =' },
      'SQLite datasource'
    ],
    [
      { type: 'redis-cluster', technology: 'Redis', hint: 'redis' },
      { file: 'package.json', line: 9, quote: '"ioredis"' },
      'Redis client'
    ],
    [
      { type: 'bucket', hint: 'object-storage' },
      { file: '.env.example', line: 29, quote: 'BUCKET_NAME=' },
      '`BUCKET_NAME` setting'
    ],
    [app('Next.js', 'next'), { file: 'package.json', line: 27, quote: '"next"' }, 'Next.js dependency'],
    [app('Fiber', 'fiber'), { file: 'go.mod', line: 20, quote: 'fiber' }, 'Fiber dependency'],
    [app('React', 'react'), { file: 'frontend/package.json', line: 7, quote: '"vite"' }, '`vite` dependency'],
    [app('FastAPI', 'fastapi'), { file: 'backend/app/main.py', line: 17, quote: 'app = FastAPI(' }, 'FastAPI app'],
    // Nothing a person would name: the page quotes the line.
    [app('FastAPI', 'fastapi'), { file: 'backend/Dockerfile', line: 1, quote: 'FROM python:3.14' }, undefined],
    [app('Go', 'go'), { file: 'cmd/app/main.go', line: 18, quote: 'app.Run(cfg)' }, undefined],
    [{ type: 'web-service' }, { file: 'package.json', line: 27, quote: '"next"' }, undefined]
  ])('%j citing %j says %p', (story, evidence, says) => {
    expect(evidenceSays(story, evidence)).toBe(says);
  });

  it('knows what the resources of a recorded app are built from', () => {
    const shop = state();
    expect(storyOf(shop, 'app', shop.composition!.resources.app!).technology).toBe('Next.js');
    expect(storyOf(shop, 'mainDatabase', shop.composition!.resources.mainDatabase!).technology).toBe('Postgres');
  });
});
