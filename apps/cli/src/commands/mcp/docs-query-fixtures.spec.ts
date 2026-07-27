import { beforeAll, describe, expect, test } from 'bun:test';
import { buildIndex, search, type LexicalIndex } from './lexical-index';

type RetrievalFixture = {
  name: string;
  query: string;
  expectedRoutes: string[];
  maxRank: number;
};

const fixtures: RetrievalFixture[] = [
  {
    name: 'Next.js deployment workflow',
    query: 'How do I deploy a Next.js app with Stacktape?',
    expectedRoutes: ['/resources/frontend/nextjs'],
    maxRank: 1
  },
  {
    name: 'Lambda property reference',
    query: 'What is the timeout property for Lambda functions?',
    expectedRoutes: ['/config-reference/function'],
    maxRank: 1
  },
  {
    name: 'Lambda logs workflow',
    query: 'How do I view logs for a deployed function?',
    expectedRoutes: [
      '/observability/logs',
      '/local-development/debugging-lambda-functions',
      '/cli/logs',
      '/cli/debug-logs'
    ],
    maxRank: 3
  },
  {
    name: 'DynamoDB CLI diagnostics',
    query: 'How do I query DynamoDB from the CLI?',
    expectedRoutes: ['/cli/query-dynamodb', '/cli/debug-dynamodb', '/resources/databases/dynamodb'],
    maxRank: 3
  },
  {
    name: 'S3 bucket referenceable params',
    query: 'What referenceable params does an S3 bucket expose?',
    expectedRoutes: ['/resources/storage/s3-bucket', '/configuration/referenceable-parameters'],
    maxRank: 3
  },
  {
    name: 'Relational database property lookup',
    query: 'What properties are available for relational database?',
    expectedRoutes: ['/config-reference/relational-database'],
    maxRank: 1
  },
  {
    name: 'Secrets in environment variables',
    query: 'How do I use secrets in environment variables?',
    expectedRoutes: ['/configuration/secrets'],
    maxRank: 2
  },
  {
    name: 'Custom domain on web service',
    query: 'How do I attach a custom domain to a web service?',
    expectedRoutes: ['/resources/compute/web-service', '/resources/networking/custom-domains'],
    maxRank: 3
  },
  {
    name: 'Connecting Lambda to Postgres',
    query: 'How do I connect a Lambda function to a Postgres database and use the connection string?',
    expectedRoutes: ['/configuration/connecting-resources', '/resources/compute/lambda-function'],
    maxRank: 2
  },
  {
    name: 'Preview changes command',
    query: 'What CLI command previews deployment changes before I deploy?',
    expectedRoutes: ['/cli/diff', '/cli/preview-changes', '/deployment-and-lifecycle/previewing-changes'],
    maxRank: 2
  },
  {
    name: 'SQL diagnostics command',
    query: 'How do I run a SQL query against an RDS database with the CLI debug command?',
    expectedRoutes: ['/cli/query-sql', '/cli/debug-sql'],
    maxRank: 1
  },
  {
    name: 'SQL diagnostics natural command-line wording',
    query: 'How do I query production postgres from the command line to check a row?',
    expectedRoutes: ['/cli/query-sql', '/cli/debug-sql'],
    maxRank: 1
  },
  {
    name: 'Schedule trigger workflow',
    query: 'How do I trigger a Lambda function on a cron schedule every day?',
    expectedRoutes: ['/resources/triggers/schedule-triggers'],
    maxRank: 3
  },
  {
    name: 'DynamoDB stream trigger workflow',
    query: 'How do I trigger a Lambda function from a DynamoDB stream?',
    expectedRoutes: ['/resources/triggers/dynamodb-streams'],
    maxRank: 5
  },
  {
    name: 'DynamoDB integration property lookup',
    query: 'DynamoDbIntegration streamArn startingPosition batchSize config reference',
    expectedRoutes: ['/resources/triggers/dynamodb-streams'],
    maxRank: 7
  }
];

describe('MCP docs realistic query fixtures', () => {
  let index: LexicalIndex;

  beforeAll(async () => {
    index = await buildIndex();
  });

  for (const fixture of fixtures) {
    test(fixture.name, () => {
      const results = search(index, { query: fixture.query, maxItems: Math.max(5, fixture.maxRank) });
      const routes = results.map((result) => result.doc.route);
      const matchedRank = routes.findIndex((route) => fixture.expectedRoutes.includes(route));

      expect(results.length, fixture.query).toBeGreaterThan(0);
      expect(matchedRank, `${fixture.query}\nTop routes:\n${routes.join('\n')}`).toBeGreaterThanOrEqual(0);
      expect(matchedRank + 1, `${fixture.query}\nTop routes:\n${routes.join('\n')}`).toBeLessThanOrEqual(
        fixture.maxRank
      );
    });
  }
});
