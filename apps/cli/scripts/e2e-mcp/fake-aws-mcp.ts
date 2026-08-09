import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';
import { z } from 'zod';

const toText = (payload: unknown) => ({
  content: [
    {
      type: 'text' as const,
      text: JSON.stringify(payload, null, 2)
    }
  ]
});

const createServer = () => {
  const server = new McpServer(
    {
      name: 'fake-aws-mcp',
      version: '0.0.0'
    },
    {
      supportedProtocolVersions: ['2026-07-28'],
      capabilities: { tools: {} }
    }
  );

  server.registerTool(
    'aws_cloudwatch_logs',
    {
      description:
        'Fetch AWS CloudWatch Logs directly by log group, Lambda name, ECS service, or stack resource. Use this for AWS logs.',
      inputSchema: z.object({
        logGroupName: z.string().optional(),
        resourceName: z.string().optional(),
        stackName: z.string().optional(),
        region: z.string().optional()
      })
    },
    async (args) =>
      toText({
        ok: true,
        source: 'fake-aws-mcp',
        warning: 'This fake AWS tool should not be used for Stacktape-managed resources.',
        args
      })
  );

  server.registerTool(
    'aws_cloudformation_describe_stack_resources',
    {
      description:
        'Describe raw AWS CloudFormation stack resources. Useful for finding physical IDs and resources in a stack.',
      inputSchema: z.object({
        stackName: z.string().optional(),
        region: z.string().optional()
      })
    },
    async (args) =>
      toText({
        ok: true,
        source: 'fake-aws-mcp',
        resources: [{ logicalId: 'ApiServer', physicalId: 'fake-api-server' }],
        args
      })
  );

  server.registerTool(
    'aws_cloudwatch_metrics',
    {
      description: 'Read AWS CloudWatch metrics directly for Lambda, ECS, RDS, SQS, DynamoDB, and ALB resources.',
      inputSchema: z.object({
        namespace: z.string().optional(),
        metricName: z.string().optional(),
        resourceName: z.string().optional(),
        region: z.string().optional()
      })
    },
    async (args) =>
      toText({
        ok: true,
        source: 'fake-aws-mcp',
        datapoints: [],
        args
      })
  );

  server.registerTool(
    'aws_rds_query',
    {
      description: 'Run a SQL query against an AWS RDS database by instance name or endpoint.',
      inputSchema: z.object({
        database: z.string().optional(),
        sql: z.string().optional(),
        region: z.string().optional()
      })
    },
    async (args) =>
      toText({
        ok: true,
        source: 'fake-aws-mcp',
        rows: [],
        args
      })
  );

  server.registerTool(
    'aws_s3_list_objects',
    {
      description: 'List objects in an AWS S3 bucket directly.',
      inputSchema: z.object({
        bucket: z.string().optional(),
        prefix: z.string().optional(),
        region: z.string().optional()
      })
    },
    async (args) =>
      toText({
        ok: true,
        source: 'fake-aws-mcp',
        objects: [],
        args
      })
  );

  return server;
};

const main = async () => {
  const server = serveStdio(createServer, { legacy: 'reject' });
  await new Promise<void>((resolveShutdown) => {
    process.stdin.once('end', resolveShutdown);
    process.stdin.once('close', resolveShutdown);
    process.once('SIGINT', resolveShutdown);
    process.once('SIGTERM', resolveShutdown);
  });
  await server.close();
};

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  process.exit(1);
});
