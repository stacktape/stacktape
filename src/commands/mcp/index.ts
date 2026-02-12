import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { buildIndex, search, formatAnswer } from './lexical-index';
import type { LexicalIndex, DocType } from './lexical-index';

// ─── MCP Server Setup ────────────────────────────────────────────────────────

const createMcpServer = (index: LexicalIndex) => {
  const server = new McpServer(
    {
      name: 'stacktape',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // ─── stacktape_docs tool ─────────────────────────────────────────────────

  server.tool(
    'stacktape_docs',
    `Search Stacktape documentation for configuration help, resource types, deployment patterns, and troubleshooting.

Use this tool when:
- User mentions Stacktape, deploying to AWS, or cloud infrastructure
- The project has a stacktape.ts, stacktape.yml, or stacktape.yaml file
- User needs help with Stacktape configuration, resource types, or deployment commands
- User asks about AWS Lambda, ECS, RDS, S3, DynamoDB, or similar AWS services in a deployment context`,
    {
      query: z.string().describe('Search query (e.g. "how to configure a lambda function", "database connection")'),
      mode: z
        .enum(['answer', 'reference', 'snippet'])
        .optional()
        .describe(
          'Response mode: answer (full docs), reference (titles+paths), snippet (code blocks). Default: answer'
        ),
      resourceType: z
        .string()
        .optional()
        .describe('Filter to a specific resource type (e.g. "function", "web-service", "relational-database")'),
      docType: z
        .enum(['config-ref', 'cli-ref', 'concept', 'recipe', 'troubleshooting', 'getting-started'])
        .optional()
        .describe('Filter to a specific doc category'),
      maxItems: z.number().optional().describe('Max number of results to return (default: 3)')
    },
    async ({ query, mode, resourceType, docType, maxItems }) => {
      const results = search(index, {
        query,
        resourceType,
        docType: docType as DocType | undefined,
        maxItems: maxItems ?? 3
      });

      const response = formatAnswer(results, mode ?? 'answer');

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(response, null, 2)
          }
        ]
      };
    }
  );

  return server;
};

// ─── Command Entry ───────────────────────────────────────────────────────────

export const commandMcp = async () => {
  // Build the lexical index from generated AI docs
  const index = await buildIndex();

  // Create and start the MCP server
  const server = createMcpServer(index);
  const transport = new StdioServerTransport();

  await server.connect(transport);
};
