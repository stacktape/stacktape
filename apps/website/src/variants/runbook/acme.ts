/*
 * The one example application the runbook shows in every figure.
 *
 * Data only. The diagram configuration is a plain object because it crosses the island boundary as
 * JSON; the file is what the wizard would write for the same project; the rows are what the Review
 * screen lists. Every figure reads names, release numbers and prices from here so the story stays
 * consistent from the first screen to the cost bars.
 */

export const ACME_CONFIG: Record<string, unknown> = {
  resources: {
    web: { type: 'nextjs-web', properties: { appDirectory: './web', connectTo: ['apiService'] } },
    apiService: {
      type: 'web-service',
      properties: {
        packaging: {
          type: 'custom-dockerfile',
          properties: { buildContextPath: './api', dockerfilePath: './api/Dockerfile' }
        },
        resources: { cpu: 0.5, memory: 1024 },
        scaling: { minInstances: 2, maxInstances: 6 },
        connectTo: ['mainDatabase', 'cache', 'worker']
      }
    },
    worker: {
      type: 'function',
      properties: {
        packaging: { type: 'stacktape-lambda-buildpack', properties: { entryfilePath: 'api/src/worker.ts' } },
        connectTo: ['mainDatabase']
      }
    },
    mainDatabase: {
      type: 'relational-database',
      properties: {
        engine: { type: 'aurora-postgresql', properties: { version: '16.4', port: 5432 } },
        accessibility: { accessibilityMode: 'vpc' }
      }
    },
    cache: { type: 'redis-cluster', properties: { engine: { type: 'redis7' }, instanceSize: 'cache.t3.micro' } },
    firewall: { type: 'web-app-firewall', properties: { scope: 'cloudfront' } }
  }
};

/** The file the wizard writes for the project above, as the Review screen shows it. */
export const ACME_YAML = `# stacktape.yml — written by npx stacktape init
# A Next.js app with a background worker,
# using a Postgres database and a Redis cache.
projectName: acme-project

resources:
  web:
    type: nextjs-web
    properties:
      appDirectory: ./web
      connectTo:
        - apiService

  apiService:
    type: web-service
    properties:
      packaging:
        type: custom-dockerfile
        properties:
          buildContextPath: ./api
          dockerfilePath: ./api/Dockerfile
      resources:
        cpu: 0.5
        memory: 1024
      scaling:
        minInstances: 2 # one can fail without an interruption
        maxInstances: 6
      connectTo:
        - mainDatabase
        - cache
        - worker

  worker:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: api/src/worker.ts
      connectTo:
        - mainDatabase

  mainDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-postgresql
        properties:
          version: '16.4'
          port: 5432
      accessibility:
        accessibilityMode: vpc # reachable only from the private network
      automatedBackupRetentionDays: 7

  cache:
    type: redis-cluster
    properties:
      engine:
        type: redis7
      instanceSize: cache.t3.micro

  firewall:
    type: web-app-firewall
    properties:
      scope: cloudfront

scripts:
  migrateDatabase:
    type: local-script-with-bastion-tunneling
    properties:
      executeCommand: npx prisma migrate deploy
      connectTo:
        - mainDatabase

hooks:
  afterDeploy:
    - scriptName: migrateDatabase
`;

export type DecidedRow = { title: string; note: string };

/** The decisions the wizard made on the reader's behalf, each shown as a changeable statement. */
export const ACME_DECIDED: DecidedRow[] = [
  {
    title: 'Keeping the database reachable only from your private network',
    note: 'No public address. Adds one small keyless jump box so local tools and migrations can tunnel in.'
  },
  {
    title: 'Running two copies of apiService',
    note: 'One can fail without an interruption. Roughly doubles its cost.'
  },
  {
    title: 'Keeping a week of database backups',
    note: 'Restore to any point in the last seven days.'
  },
  {
    title: 'Running prisma migrate deploy after every deploy',
    note: 'Found in package.json.'
  }
];

export const ACME_ESTIMATE = { resources: 14, monthly: '$112' };
