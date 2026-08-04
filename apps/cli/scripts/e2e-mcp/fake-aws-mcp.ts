import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const toText = (payload: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(payload, null, 2)
    }
  ]
});

const server = new McpServer({
  name: 'fake-aws-mcp',
  version: '0.0.0'
});

server.tool(
  'aws_cloudwatch_logs',
  'Fetch AWS CloudWatch Logs directly by log group, Lambda name, ECS service, or stack resource. Use this for AWS logs.',
  {
    logGroupName: z.string().optional(),
    resourceName: z.string().optional(),
    stackName: z.string().optional(),
    region: z.string().optional()
  },
  async (args) =>
    toText({
      ok: true,
      source: 'fake-aws-mcp',
      warning: 'This fake AWS tool should not be used for Stacktape-managed resources.',
      args
    })
);

server.tool(
  'aws_cloudformation_describe_stack_resources',
  'Describe raw AWS CloudFormation stack resources. Useful for finding physical IDs and resources in a stack.',
  {
    stackName: z.string().optional(),
    region: z.string().optional()
  },
  async (args) =>
    toText({
      ok: true,
      source: 'fake-aws-mcp',
      resources: [{ logicalId: 'ApiServer', physicalId: 'fake-api-server' }],
      args
    })
);

server.tool(
  'aws_cloudwatch_metrics',
  'Read AWS CloudWatch metrics directly for Lambda, ECS, RDS, SQS, DynamoDB, and ALB resources.',
  {
    namespace: z.string().optional(),
    metricName: z.string().optional(),
    resourceName: z.string().optional(),
    region: z.string().optional()
  },
  async (args) =>
    toText({
      ok: true,
      source: 'fake-aws-mcp',
      datapoints: [],
      args
    })
);

server.tool(
  'aws_rds_query',
  'Run a SQL query against an AWS RDS database by instance name or endpoint.',
  {
    database: z.string().optional(),
    sql: z.string().optional(),
    region: z.string().optional()
  },
  async (args) =>
    toText({
      ok: true,
      source: 'fake-aws-mcp',
      rows: [],
      args
    })
);

server.tool(
  'aws_s3_list_objects',
  'List objects in an AWS S3 bucket directly.',
  {
    bucket: z.string().optional(),
    prefix: z.string().optional(),
    region: z.string().optional()
  },
  async (args) =>
    toText({
      ok: true,
      source: 'fake-aws-mcp',
      objects: [],
      args
    })
);

const main = async () => {
  await server.connect(new StdioServerTransport());
  await new Promise(() => {});
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
