/**
 * The example app in the diagram: what `stacktape init` finds in the repository, the resource it writes to
 * `stacktape.yml` for it, and the AWS service that resource becomes. The resource types are the real v4 types
 * (`packages/config/src/resource-types.ts`). Each AWS service gets a glyph on a tile in its AWS category colour,
 * the same categories the Console's diagram uses (`packages/ui-react/src/resource-icon/catalog.ts`).
 */
export type Glyph = 'cdn' | 'bucket' | 'container' | 'database' | 'queue' | 'lambda' | 'cache';
type Category = 'compute' | 'database' | 'integration' | 'network' | 'storage';

type Row = {
  id: string;
  file: string;
  found: string;
  resources: readonly (readonly [name: string, type: string])[];
  service: string;
  role: string;
  icons: readonly (readonly [glyph: Glyph, category: Category])[];
};

export const rows: readonly Row[] = [
  {
    id: 'web',
    file: 'web/vite.config.ts',
    found: 'React frontend',
    resources: [['web', 'hosting-bucket']],
    service: 'CloudFront + S3',
    role: 'serves the frontend',
    icons: [
      ['cdn', 'network'],
      ['bucket', 'storage']
    ]
  },
  {
    id: 'api',
    file: 'Dockerfile',
    found: 'API server',
    resources: [['api', 'web-service']],
    service: 'ECS Fargate',
    role: 'runs the API container',
    icons: [['container', 'compute']]
  },
  {
    id: 'database',
    file: 'prisma/schema.prisma',
    found: 'Postgres schema',
    resources: [['database', 'relational-database']],
    service: 'RDS Postgres',
    role: 'the database',
    icons: [['database', 'database']]
  },
  {
    id: 'jobs',
    file: 'src/worker.ts',
    found: 'queue consumer',
    resources: [
      ['jobs', 'sqs-queue'],
      ['worker', 'function']
    ],
    service: 'SQS + Lambda',
    role: 'runs background jobs',
    icons: [
      ['queue', 'integration'],
      ['lambda', 'compute']
    ]
  },
  {
    id: 'cache',
    file: 'package.json',
    found: 'uses ioredis',
    resources: [['cache', 'redis']],
    service: 'ElastiCache Redis',
    role: 'the cache',
    icons: [['cache', 'database']]
  }
];

/** The part lit before anyone points at the diagram: the clearest file-to-service pair. */
export const lit = 'api';
