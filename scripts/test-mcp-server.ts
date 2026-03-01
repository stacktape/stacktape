/**
 * Stacktape MCP Server Test Suite
 *
 * Tests the Stacktape MCP server through Claude Code CLI in non-interactive mode.
 * Evaluates: tool selection, parameter quality, response quality, token efficiency.
 *
 * Usage:
 *   bun run scripts/test-mcp-server.ts                    # Run all tests
 *   bun run scripts/test-mcp-server.ts --ids docs-1,ops-1 # Run specific tests
 *   bun run scripts/test-mcp-server.ts --category docs    # Run category
 *   bun run scripts/test-mcp-server.ts --dry-run          # Show test cases only
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// ─── Types ─────────────────────────────────────────────────────────────────────

type TestCase = {
  id: string;
  category: 'docs' | 'ops' | 'diagnose' | 'compound' | 'negative' | 'vague' | 'dev';
  prompt: string;
  /** MCP tool names that SHOULD be called (e.g. "stacktape_docs") */
  expectedTools: string[];
  /** Brief description of what this test validates */
  description: string;
  /** Model to use (default: sonnet) */
  model?: string;
  /** Max budget for this test in USD */
  maxBudget?: number;
  /** Timeout in ms */
  timeout?: number;
  /** Expected parameters for the first tool call */
  expectedParams?: Record<string, unknown>;
};

type StreamEvent = {
  type: string;
  subtype?: string;
  message?: {
    content?: Array<{
      type: string;
      text?: string;
      name?: string;
      input?: Record<string, unknown>;
    }>;
  };
  tool_use_result?: Array<{ type: string; text?: string }>;
  session_id?: string;
  mcp_servers?: Array<{ name: string; status: string }>;
  tools?: string[];
  // result fields
  total_cost_usd?: number;
  duration_ms?: number;
  num_turns?: number;
  result?: string;
  is_error?: boolean;
  usage?: Record<string, unknown>;
  modelUsage?: Record<
    string,
    {
      inputTokens: number;
      outputTokens: number;
      cacheReadInputTokens: number;
      cacheCreationInputTokens: number;
      costUSD: number;
    }
  >;
};

type ToolCall = {
  name: string;
  input: Record<string, unknown>;
  isMcp: boolean;
};

type ToolResult = {
  toolUseId: string;
  content: string;
};

type TestResult = {
  testCase: TestCase;
  mcpConnected: boolean;
  mcpToolsAvailable: string[];
  toolCalls: ToolCall[];
  toolResults: ToolResult[];
  finalResponse: string;
  durationMs: number;
  costUsd: number;
  numTurns: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  isError: boolean;
  rawEvents: StreamEvent[];
  scores: {
    /** 0/1: Did the MCP server connect? */
    mcpActivation: number;
    /** 0-3: Was the right tool called with right params? */
    toolSelection: number;
    /** 0-3: How helpful/accurate was the response? (automated heuristics) */
    responseQuality: number;
    /** 0-3: Token efficiency (lower tokens = better) */
    tokenEfficiency: number;
    /** Weighted total out of 10 */
    total: number;
  };
  scoringNotes: string[];
};

// ─── Test Cases ────────────────────────────────────────────────────────────────

const TEST_CASES: TestCase[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // DOCS: Should trigger stacktape_docs
  // ═══════════════════════════════════════════════════════════════════════════

  // --- Framework deployment ---
  {
    id: 'docs-1',
    category: 'docs',
    prompt: 'How do I deploy a Next.js app with Stacktape? I just need the basic configuration. Be concise.',
    expectedTools: ['stacktape_docs'],
    description: 'Next.js deployment config'
  },
  {
    id: 'docs-2',
    category: 'docs',
    prompt: 'What database options does Stacktape support? List them briefly.',
    expectedTools: ['stacktape_docs'],
    description: 'Database options overview'
  },
  {
    id: 'docs-3',
    category: 'docs',
    prompt: 'How do I set environment variables for my Lambda function in Stacktape? Show me a config example.',
    expectedTools: ['stacktape_docs'],
    description: 'Lambda env vars config'
  },
  {
    id: 'docs-4',
    category: 'docs',
    prompt: 'I need to set up a cron job that runs every hour. How do I do this in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Scheduled tasks / cron'
  },
  {
    id: 'docs-5',
    category: 'docs',
    prompt: 'How do I add a custom domain to my Stacktape web service?',
    expectedTools: ['stacktape_docs'],
    description: 'Custom domain config'
  },
  {
    id: 'docs-6',
    category: 'docs',
    prompt: 'Show me how to deploy a React SPA with Stacktape using a hosting bucket.',
    expectedTools: ['stacktape_docs'],
    description: 'Static site / hosting bucket'
  },
  {
    id: 'docs-7',
    category: 'docs',
    prompt: 'How do I deploy a Python FastAPI app using Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Python/FastAPI deployment'
  },
  {
    id: 'docs-8',
    category: 'docs',
    prompt: 'How do I configure a container-based web service in Stacktape with auto-scaling?',
    expectedTools: ['stacktape_docs'],
    description: 'Web service with auto-scaling'
  },
  {
    id: 'docs-9',
    category: 'docs',
    prompt: 'What is the stacktape.ts config file format? Show me the basic structure.',
    expectedTools: ['stacktape_docs'],
    description: 'Config file structure'
  },
  {
    id: 'docs-10',
    category: 'docs',
    prompt: 'How do I connect my Lambda function to a PostgreSQL database in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'connectTo / resource connections'
  },

  // --- Resource types ---
  {
    id: 'docs-11',
    category: 'docs',
    prompt: 'How do I create a DynamoDB table in Stacktape? Show the config.',
    expectedTools: ['stacktape_docs'],
    description: 'DynamoDB table config'
  },
  {
    id: 'docs-12',
    category: 'docs',
    prompt: 'How do I set up an S3 bucket in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'S3 bucket config'
  },
  {
    id: 'docs-13',
    category: 'docs',
    prompt: 'How do I configure Redis/ElastiCache in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Redis cluster config'
  },
  {
    id: 'docs-14',
    category: 'docs',
    prompt: 'How do I set up a CloudFront CDN in front of my Stacktape web service?',
    expectedTools: ['stacktape_docs'],
    description: 'CDN configuration'
  },
  {
    id: 'docs-15',
    category: 'docs',
    prompt: 'What types of load balancers does Stacktape support for web services?',
    expectedTools: ['stacktape_docs'],
    description: 'Load balancer types'
  },

  // --- Operations & concepts ---
  {
    id: 'docs-16',
    category: 'docs',
    prompt: 'How do I use secrets in Stacktape? How do I reference a secret in my config?',
    expectedTools: ['stacktape_docs'],
    description: 'Secrets management'
  },
  {
    id: 'docs-17',
    category: 'docs',
    prompt: 'How does Stacktape handle VPC networking? When do I need a VPC?',
    expectedTools: ['stacktape_docs'],
    description: 'VPC / networking concepts'
  },
  {
    id: 'docs-18',
    category: 'docs',
    prompt: 'How do I configure CORS for my Stacktape API?',
    expectedTools: ['stacktape_docs'],
    description: 'CORS configuration'
  },
  {
    id: 'docs-19',
    category: 'docs',
    prompt: 'What are the different packaging options in Stacktape? buildpack vs dockerfile?',
    expectedTools: ['stacktape_docs'],
    description: 'Packaging options'
  },
  {
    id: 'docs-20',
    category: 'docs',
    prompt: 'How do I run database migrations with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'DB migrations / scripts'
  },

  // --- CLI commands ---
  {
    id: 'docs-21',
    category: 'docs',
    prompt: 'What CLI commands does Stacktape have? List them.',
    expectedTools: ['stacktape_docs'],
    description: 'CLI commands overview'
  },
  {
    id: 'docs-22',
    category: 'docs',
    prompt: 'How do I preview changes before deploying with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'preview-changes command'
  },
  {
    id: 'docs-23',
    category: 'docs',
    prompt: 'How do I rollback a Stacktape deployment?',
    expectedTools: ['stacktape_docs'],
    description: 'Rollback command'
  },
  {
    id: 'docs-24',
    category: 'docs',
    prompt: 'What is the difference between Stacktape function and web-service resource types?',
    expectedTools: ['stacktape_docs'],
    description: 'function vs web-service'
  },
  {
    id: 'docs-25',
    category: 'docs',
    prompt: 'How do I configure health checks for my Stacktape container?',
    expectedTools: ['stacktape_docs'],
    description: 'Health check config'
  },

  // --- Advanced topics ---
  {
    id: 'docs-26',
    category: 'docs',
    prompt: 'How do I set up a monorepo deployment with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Monorepo setup'
  },
  {
    id: 'docs-27',
    category: 'docs',
    prompt: 'How do I configure SNS topics and event-driven architecture in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'SNS / event-driven'
  },
  {
    id: 'docs-28',
    category: 'docs',
    prompt: 'How do I use Step Functions / workflows in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Step Functions config'
  },
  {
    id: 'docs-29',
    category: 'docs',
    prompt: 'How do I configure a Kinesis stream in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Kinesis stream config'
  },
  {
    id: 'docs-30',
    category: 'docs',
    prompt: 'How do I set up WebSocket support in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'WebSocket support'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS: Should trigger stacktape_diagnose or stacktape_ops
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ops-1',
    category: 'ops',
    prompt: 'Show me all my deployed Stacktape stacks in eu-west-1. Just list them.',
    expectedTools: ['stacktape_diagnose'],
    description: 'List stacks in eu-west-1',
    expectedParams: { operation: 'info_stacks' }
  },
  {
    id: 'ops-2',
    category: 'ops',
    prompt: 'Who am I currently logged in as in Stacktape? Just tell me the identity.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Identity check - info_whoami',
    expectedParams: { operation: 'info_whoami' }
  },
  {
    id: 'ops-3',
    category: 'ops',
    prompt: 'Show me the recent deployment operations for projectName "console-app" in eu-west-1.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Recent operations history',
    expectedParams: { operation: 'info_operations' }
  },
  {
    id: 'ops-4',
    category: 'ops',
    prompt:
      'Create a new Stacktape secret called "my-api-key" with value "sk-test123" in eu-west-1 for project "ai-tests" stage "dev".',
    expectedTools: ['stacktape_ops'],
    description: 'Create a secret',
    expectedParams: { operation: 'secret_create' }
  },
  {
    id: 'ops-5',
    category: 'ops',
    prompt: 'Get the value of the Stacktape secret "my-api-key" in eu-west-1 for project "ai-tests" stage "dev".',
    expectedTools: ['stacktape_ops'],
    description: 'Get a secret value',
    expectedParams: { operation: 'secret_get' }
  },
  {
    id: 'ops-6',
    category: 'ops',
    prompt: 'Show me the details of the stack "console-app-dev" in eu-west-1.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Stack details - info_stack',
    expectedParams: { operation: 'info_stack' }
  },
  {
    id: 'ops-7',
    category: 'ops',
    prompt: 'Delete the Stacktape secret "my-api-key" for project "ai-tests" stage "dev" in eu-west-1.',
    expectedTools: ['stacktape_ops'],
    description: 'Delete a secret',
    expectedParams: { operation: 'secret_delete' }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOUND: Multi-step or multi-tool scenarios
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'compound-1',
    category: 'compound',
    prompt:
      'I want to build a REST API with a PostgreSQL database using Stacktape. Search the docs for the right configuration.',
    expectedTools: ['stacktape_docs'],
    description: 'API + DB config from docs'
  },
  {
    id: 'compound-2',
    category: 'compound',
    prompt:
      'Look up how to configure a web-service in Stacktape docs, and also check what stacks I have deployed in eu-west-1.',
    expectedTools: ['stacktape_docs', 'stacktape_diagnose'],
    description: 'Docs lookup + list stacks'
  },
  {
    id: 'compound-3',
    category: 'compound',
    prompt:
      'I want to deploy a full-stack app: React frontend on a hosting bucket and Node.js API on Lambda with DynamoDB. Search Stacktape docs for how to configure each piece.',
    expectedTools: ['stacktape_docs'],
    description: 'Full-stack config from docs'
  },
  {
    id: 'compound-4',
    category: 'compound',
    prompt: 'First, check who I am in Stacktape, then look up the docs on how to configure a Lambda function.',
    expectedTools: ['stacktape_diagnose', 'stacktape_docs'],
    description: 'Identity + docs lookup'
  },
  {
    id: 'compound-5',
    category: 'compound',
    prompt:
      'Search Stacktape docs for how to set up Redis, and also search for how to configure environment variables.',
    expectedTools: ['stacktape_docs'],
    description: 'Multiple doc searches'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VAGUE: Natural language, should still trigger tools
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vague-1',
    category: 'vague',
    prompt: 'I want to deploy my app to AWS using Stacktape. How do I get started?',
    expectedTools: ['stacktape_docs'],
    description: 'Getting started question'
  },
  {
    id: 'vague-2',
    category: 'vague',
    prompt: 'My API is slow. How can I debug it with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Debugging question'
  },
  {
    id: 'vague-3',
    category: 'vague',
    prompt: 'How much will it cost me to run a small web app on Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Pricing question'
  },
  {
    id: 'vague-4',
    category: 'vague',
    prompt: 'I have a SaaS app with authentication, API, and database. How should I structure it in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Architecture advice'
  },
  {
    id: 'vague-5',
    category: 'vague',
    prompt: 'Can Stacktape handle WebSockets? I need real-time features.',
    expectedTools: ['stacktape_docs'],
    description: 'WebSocket capability question'
  },
  {
    id: 'vague-6',
    category: 'vague',
    prompt: 'What is the fastest way to get a Node.js API running on AWS with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Quick start guidance'
  },
  {
    id: 'vague-7',
    category: 'vague',
    prompt: 'I need to store files uploaded by users. What should I use in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'File storage question'
  },
  {
    id: 'vague-8',
    category: 'vague',
    prompt: 'How do I handle background jobs in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Background processing'
  },
  {
    id: 'vague-9',
    category: 'vague',
    prompt: 'I want to set up CI/CD for my Stacktape project. How?',
    expectedTools: ['stacktape_docs'],
    description: 'CI/CD setup'
  },
  {
    id: 'vague-10',
    category: 'vague',
    prompt:
      "I'm building an AI chatbot. I need an API, a database, and file storage. Help me set it up with Stacktape.",
    expectedTools: ['stacktape_docs'],
    description: 'AI chatbot architecture'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEGATIVE: Should NOT use Stacktape MCP tools
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'neg-1',
    category: 'negative',
    prompt: 'What is the capital of France? Answer in one word.',
    expectedTools: [],
    description: 'General knowledge - not Stacktape'
  },
  {
    id: 'neg-2',
    category: 'negative',
    prompt: 'Write a Python function that checks if a number is prime. Just the code, nothing else.',
    expectedTools: [],
    description: 'General coding - not Stacktape'
  },
  {
    id: 'neg-3',
    category: 'negative',
    prompt: 'Explain the difference between TCP and UDP in one paragraph.',
    expectedTools: [],
    description: 'Networking theory - not Stacktape'
  },
  {
    id: 'neg-4',
    category: 'negative',
    prompt: 'How do I create a React component with useState? Show code.',
    expectedTools: [],
    description: 'React basics - not Stacktape'
  },
  {
    id: 'neg-5',
    category: 'negative',
    prompt: 'What is the time complexity of quicksort?',
    expectedTools: [],
    description: 'Algorithm theory - not Stacktape'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCS (batch 2): Less-tested resource types, directives, packaging
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'docs-31',
    category: 'docs',
    prompt: 'How do I configure an SQS queue with a Lambda consumer in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'SQS queue + Lambda trigger'
  },
  {
    id: 'docs-32',
    category: 'docs',
    prompt: 'How do I run batch jobs in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Batch job resource'
  },
  {
    id: 'docs-33',
    category: 'docs',
    prompt: 'How do I configure a multi-container workload in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Multi-container workload'
  },
  {
    id: 'docs-34',
    category: 'docs',
    prompt: 'How do I add authentication or authorizers to my Stacktape API?',
    expectedTools: ['stacktape_docs'],
    description: 'API auth / authorizer config'
  },
  {
    id: 'docs-35',
    category: 'docs',
    prompt: 'How do I use a custom Dockerfile for my Stacktape deployment instead of a buildpack?',
    expectedTools: ['stacktape_docs'],
    description: 'Custom dockerfile packaging'
  },
  {
    id: 'docs-36',
    category: 'docs',
    prompt: 'How do I run scripts before or after deployment in Stacktape? Like hooks or beforeDeploy.',
    expectedTools: ['stacktape_docs'],
    description: 'Deployment hooks / scripts'
  },
  {
    id: 'docs-37',
    category: 'docs',
    prompt: 'How do I reference secrets in my Stacktape config using $Secret()? Show an example.',
    expectedTools: ['stacktape_docs'],
    description: '$Secret directive usage'
  },
  {
    id: 'docs-38',
    category: 'docs',
    prompt: 'How do I reference outputs from other Stacktape stacks using $CfStackOutput()?',
    expectedTools: ['stacktape_docs'],
    description: 'Cross-stack references'
  },
  {
    id: 'docs-39',
    category: 'docs',
    prompt: 'How do I configure a private database that is not publicly accessible in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'DB accessibility modes'
  },
  {
    id: 'docs-40',
    category: 'docs',
    prompt: 'How do I deploy a Go Lambda function with Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Go language support'
  },
  {
    id: 'docs-41',
    category: 'docs',
    prompt: 'How do I configure GPU instances for ML inference in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'GPU / ML workloads'
  },
  {
    id: 'docs-42',
    category: 'docs',
    prompt: 'How do I add custom CloudFormation resources or overrides to my Stacktape config?',
    expectedTools: ['stacktape_docs'],
    description: 'CF overrides / custom resources'
  },
  {
    id: 'docs-43',
    category: 'docs',
    prompt: 'How does hot swap or zero-downtime deployment work in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'Deployment strategies'
  },
  {
    id: 'docs-44',
    category: 'docs',
    prompt: 'How do I configure an OpenSearch cluster in Stacktape?',
    expectedTools: ['stacktape_docs'],
    description: 'OpenSearch config'
  },
  {
    id: 'docs-45',
    category: 'docs',
    prompt: 'How do I set up a Telegram bot with Stacktape? Is there a starter project?',
    expectedTools: ['stacktape_docs'],
    description: 'Telegram bot template'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OPS (batch 2): Deploy, delete, preview, compile, rollback, scripts
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'ops-8',
    category: 'ops',
    prompt:
      'Deploy the stack at configPath "starter-projects/hono-api/stacktape.yml" with projectName "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_ops'],
    description: 'Deploy via MCP',
    expectedParams: { operation: 'deploy' },
    timeout: 600000,
    maxBudget: 1
  },
  {
    id: 'ops-9',
    category: 'ops',
    prompt:
      'Preview the changes for projectName "ai-tests", stage "mcpt1", region "eu-west-1", configPath "starter-projects/hono-api/stacktape.yml". Don\'t actually deploy, just show me what would change.',
    expectedTools: ['stacktape_ops'],
    description: 'Preview changes via MCP',
    expectedParams: { operation: 'preview_changes' },
    timeout: 300000
  },
  {
    id: 'ops-10',
    category: 'ops',
    prompt:
      'Compile the CloudFormation template for configPath "starter-projects/hono-api/stacktape.yml", projectName "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_ops'],
    description: 'Compile CF template via MCP',
    expectedParams: { operation: 'compile_template' },
    timeout: 300000
  },
  {
    id: 'ops-11',
    category: 'ops',
    prompt: 'Rollback the stack for projectName "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_ops'],
    description: 'Rollback deployment',
    expectedParams: { operation: 'rollback' }
  },
  {
    id: 'ops-12',
    category: 'ops',
    prompt:
      'Delete the stack for projectName "ai-tests", stage "mcpt1", region "eu-west-1", configPath "starter-projects/hono-api/stacktape.yml". Yes, I confirm the deletion.',
    expectedTools: ['stacktape_ops'],
    description: 'Delete with confirm',
    expectedParams: { operation: 'delete' },
    timeout: 600000,
    maxBudget: 1
  },
  {
    id: 'ops-13',
    category: 'ops',
    prompt:
      'Deploy the stack using configPath "_test-stacks/simple-lambda/stacktape.ts", projectName "ai-tests", stage "mcpt2", region "eu-west-1".',
    expectedTools: ['stacktape_ops'],
    description: 'Deploy simple Lambda via MCP',
    expectedParams: { operation: 'deploy' },
    timeout: 600000,
    maxBudget: 1
  },
  {
    id: 'ops-14',
    category: 'ops',
    prompt: 'Delete the stack for projectName "ai-tests", stage "mcpt2", in eu-west-1. Yes, I confirm the deletion.',
    expectedTools: ['stacktape_ops'],
    description: 'Delete simple Lambda stack',
    expectedParams: { operation: 'delete' },
    timeout: 600000,
    maxBudget: 1
  },
  {
    id: 'ops-15',
    category: 'ops',
    prompt:
      'Run the script named "migrate" for projectName "ai-tests", stage "mcpt1", region "eu-west-1", configPath "starter-projects/hono-api/stacktape.yml".',
    expectedTools: ['stacktape_ops'],
    description: 'Script run via MCP',
    expectedParams: { operation: 'script_run' }
  },
  {
    id: 'ops-16',
    category: 'ops',
    prompt: 'Create a Stacktape secret called "db-password" with value "supersecret123" in eu-west-1.',
    expectedTools: ['stacktape_ops'],
    description: 'Secret create (no project)',
    expectedParams: { operation: 'secret_create' }
  },
  {
    id: 'ops-17',
    category: 'ops',
    prompt: 'Get the Stacktape secret "db-password" in eu-west-1.',
    expectedTools: ['stacktape_ops'],
    description: 'Secret get (no project)',
    expectedParams: { operation: 'secret_get' }
  },
  {
    id: 'ops-18',
    category: 'ops',
    prompt: 'Delete the Stacktape secret "db-password" in eu-west-1.',
    expectedTools: ['stacktape_ops'],
    description: 'Secret delete (no project)',
    expectedParams: { operation: 'secret_delete' }
  },
  {
    id: 'ops-19',
    category: 'ops',
    prompt:
      'Deploy my Stacktape project. The config is at "starter-projects/hono-api/stacktape.yml", project name is "myapp", stage "prod", and deploy to us-east-1.',
    expectedTools: ['stacktape_ops'],
    description: 'Deploy with different region',
    expectedParams: { operation: 'deploy' },
    timeout: 300000
  },
  {
    id: 'ops-20',
    category: 'ops',
    prompt:
      'I want to deploy my app to Stacktape. Project name is "web-store", stage "staging", region "eu-west-1", and the config file is "infra/stacktape.yml".',
    expectedTools: ['stacktape_ops'],
    description: 'Deploy with nested config path',
    expectedParams: { operation: 'deploy' },
    timeout: 300000
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DIAGNOSE: Logs, metrics, alarms, DB queries, container exec, AWS SDK
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'diag-1',
    category: 'diagnose',
    prompt: 'Show me the logs for the Lambda function "api" in project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'View Lambda logs',
    expectedParams: { operation: 'logs' }
  },
  {
    id: 'diag-2',
    category: 'diagnose',
    prompt:
      'Show me the logs for the web service "backend" in project "console-app", stage "dev", region "eu-west-1". Filter for errors only.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Filtered logs',
    expectedParams: { operation: 'logs' }
  },
  {
    id: 'diag-3',
    category: 'diagnose',
    prompt: 'Show me the CPU metrics for the resource "api" in project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'View resource metrics',
    expectedParams: { operation: 'metrics' }
  },
  {
    id: 'diag-4',
    category: 'diagnose',
    prompt: 'Check the alarm states for resource "api" in project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'Check alarms',
    expectedParams: { operation: 'alarms' }
  },
  {
    id: 'diag-5',
    category: 'diagnose',
    prompt:
      'Query the DynamoDB table "postsTable" - scan all items. Project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'DynamoDB scan',
    expectedParams: { operation: 'dynamodb' }
  },
  {
    id: 'diag-6',
    category: 'diagnose',
    prompt:
      'Run this SQL query on the database "mainDb": SELECT * FROM users LIMIT 10. Project "console-app", stage "dev", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'SQL query',
    expectedParams: { operation: 'sql' }
  },
  {
    id: 'diag-7',
    category: 'diagnose',
    prompt:
      'Execute the command "ls /app" in the container "backend" for project "console-app", stage "dev", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'Container exec',
    expectedParams: { operation: 'container_exec' }
  },
  {
    id: 'diag-8',
    category: 'diagnose',
    prompt: 'Call the AWS SDK: service "s3", command "ListBuckets" in eu-west-1.',
    expectedTools: ['stacktape_diagnose'],
    description: 'AWS SDK call',
    expectedParams: { operation: 'aws_sdk' }
  },
  {
    id: 'diag-9',
    category: 'diagnose',
    prompt: 'Show me the detailed info for the stack "ai-tests-mcpt1" in eu-west-1.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Stack details by stackName',
    expectedParams: { operation: 'info_stack' }
  },
  {
    id: 'diag-10',
    category: 'diagnose',
    prompt: 'List my recent deployment operations for project "console-app" in eu-west-1. Show the last 5.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Operations with limit',
    expectedParams: { operation: 'info_operations' }
  },
  {
    id: 'diag-11',
    category: 'diagnose',
    prompt:
      'Query Redis: get key "session:user123" from resource "cache" in project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'Redis query',
    expectedParams: { operation: 'redis' }
  },
  {
    id: 'diag-12',
    category: 'diagnose',
    prompt:
      'Search OpenSearch index "logs" for documents matching "error 500" in resource "search", project "ai-tests", stage "mcpt1", region "eu-west-1".',
    expectedTools: ['stacktape_diagnose'],
    description: 'OpenSearch query',
    expectedParams: { operation: 'opensearch' }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEV: Dev mode lifecycle
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'dev-1',
    category: 'dev',
    prompt:
      'Start Stacktape dev mode for projectName "dev-mode", region "eu-west-1", configPath "_test-stacks/simple-local-dev/stacktape.ts".',
    expectedTools: ['stacktape_dev'],
    description: 'Start dev session',
    expectedParams: { operation: 'start' },
    timeout: 300000,
    maxBudget: 1
  },
  {
    id: 'dev-2',
    category: 'dev',
    prompt: 'Check the status of my Stacktape dev session.',
    expectedTools: ['stacktape_dev'],
    description: 'Check dev status',
    expectedParams: { operation: 'status' }
  },
  {
    id: 'dev-3',
    category: 'dev',
    prompt: 'Show me the dev mode logs for my Stacktape project.',
    expectedTools: ['stacktape_dev'],
    description: 'Read dev logs',
    expectedParams: { operation: 'logs' }
  },
  {
    id: 'dev-4',
    category: 'dev',
    prompt: 'Rebuild the workload "api" in my Stacktape dev session.',
    expectedTools: ['stacktape_dev'],
    description: 'Rebuild workload',
    expectedParams: { operation: 'rebuild' }
  },
  {
    id: 'dev-5',
    category: 'dev',
    prompt: 'Stop the Stacktape dev session.',
    expectedTools: ['stacktape_dev'],
    description: 'Stop dev session',
    expectedParams: { operation: 'stop' }
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPOUND (batch 2): Multi-step deployment workflows
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'compound-6',
    category: 'compound',
    prompt:
      'Look up how to configure a Lambda function in Stacktape docs, then deploy the stack at "starter-projects/hono-api/stacktape.yml" with projectName "ai-tests", stage "mcpt3", region "eu-west-1".',
    expectedTools: ['stacktape_docs', 'stacktape_ops'],
    description: 'Docs lookup + deploy',
    timeout: 600000,
    maxBudget: 1
  },
  {
    id: 'compound-7',
    category: 'compound',
    prompt:
      'First create a Stacktape secret "test-key" with value "abc123" in eu-west-1, then check who I am in Stacktape.',
    expectedTools: ['stacktape_ops', 'stacktape_diagnose'],
    description: 'Secret create + identity check'
  },
  {
    id: 'compound-8',
    category: 'compound',
    prompt:
      'Preview the changes for projectName "ai-tests", stage "mcpt1", region "eu-west-1", configPath "starter-projects/hono-api/stacktape.yml", and also show me what stacks I have deployed in eu-west-1.',
    expectedTools: ['stacktape_ops', 'stacktape_diagnose'],
    description: 'Preview changes + list stacks',
    timeout: 300000
  },
  {
    id: 'compound-9',
    category: 'compound',
    prompt: 'List all my Stacktape stacks in eu-west-1, then show me the details of the first one you find.',
    expectedTools: ['stacktape_diagnose'],
    description: 'List stacks + get details of one'
  },
  {
    id: 'compound-10',
    category: 'compound',
    prompt:
      'Search the Stacktape docs for how to configure DynamoDB, then also search for how to configure a Lambda function event trigger from DynamoDB streams.',
    expectedTools: ['stacktape_docs'],
    description: 'Multiple doc topics'
  },
  {
    id: 'compound-11',
    category: 'compound',
    prompt:
      'Show me the logs for resource "api" in project "ai-tests" stage "mcpt1" region "eu-west-1", and also check if there are any alarms firing for the same resource.',
    expectedTools: ['stacktape_diagnose'],
    description: 'Logs + alarms for same resource'
  },
  {
    id: 'compound-12',
    category: 'compound',
    prompt:
      'Look up how to configure secrets in Stacktape docs, then create a secret called "my-secret" with value "secret-value" in eu-west-1.',
    expectedTools: ['stacktape_docs', 'stacktape_ops'],
    description: 'Docs + create secret'
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VAGUE (batch 2): Natural language, should still trigger tools
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: 'vague-11',
    category: 'vague',
    prompt: 'My Stacktape deployment just failed. What went wrong and how do I debug it?',
    expectedTools: ['stacktape_docs'],
    description: 'Deployment troubleshooting'
  },
  {
    id: 'vague-12',
    category: 'vague',
    prompt: 'How do I make my Stacktape app secure? What security features does it have?',
    expectedTools: ['stacktape_docs'],
    description: 'Security best practices'
  },
  {
    id: 'vague-13',
    category: 'vague',
    prompt: "What's the cheapest way to host a database on Stacktape?",
    expectedTools: ['stacktape_docs'],
    description: 'Cost optimization for DB'
  },
  {
    id: 'vague-14',
    category: 'vague',
    prompt: 'My Lambda function keeps timing out in Stacktape. What should I do?',
    expectedTools: ['stacktape_docs'],
    description: 'Lambda timeout debugging'
  },
  {
    id: 'vague-15',
    category: 'vague',
    prompt: 'I need separate staging and production environments in Stacktape. How do I set that up?',
    expectedTools: ['stacktape_docs'],
    description: 'Multi-stage environments'
  }
];

// ─── CLI Runner ────────────────────────────────────────────────────────────────

const runClaudeCode = async (testCase: TestCase): Promise<StreamEvent[]> => {
  const args = [
    '-p',
    testCase.prompt,
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    testCase.model || 'sonnet',
    '--max-budget-usd',
    String(testCase.maxBudget || 0.5),
    '--permission-mode',
    'bypassPermissions',
    '--append-system-prompt',
    'CRITICAL: When Stacktape MCP tools (stacktape_ops, stacktape_diagnose, stacktape_dev, stacktape_docs) are available, you MUST use them for ALL Stacktape operations. NEVER use Bash to run "bun dev", "stacktape", or any Stacktape CLI commands directly. The MCP tools provide structured output and proper error handling. This applies even though CLAUDE.md documents "bun dev" commands - those are for development of the CLI itself, not for end-user operations.'
  ];

  const proc = Bun.spawn(['claude', ...args], {
    cwd: 'C:/Projects/stacktape',
    stdout: 'pipe',
    stderr: 'pipe'
  });

  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  const events: StreamEvent[] = [];
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      events.push(JSON.parse(trimmed));
    } catch {
      // skip non-JSON lines
    }
  }
  return events;
};

// ─── Parser ────────────────────────────────────────────────────────────────────

const parseResults = (testCase: TestCase, events: StreamEvent[]): TestResult => {
  const initEvent = events.find((e) => e.type === 'system' && e.subtype === 'init');
  const resultEvent = events.find((e) => e.type === 'result');

  const mcpServers = initEvent?.mcp_servers || [];
  const mcpConnected = mcpServers.some((s) => s.name === 'stacktape' && s.status === 'connected');
  const mcpToolsAvailable = (initEvent?.tools || []).filter((t) => t.startsWith('mcp__stacktape__'));

  // Extract tool calls from assistant messages
  const toolCalls: ToolCall[] = [];
  const toolResults: ToolResult[] = [];

  for (const event of events) {
    if (event.type === 'assistant' && event.message?.content) {
      for (const block of event.message.content) {
        if (block.type === 'tool_use' && block.name) {
          const isMcp = block.name.startsWith('mcp__stacktape__');
          toolCalls.push({
            name: isMcp ? block.name.replace('mcp__stacktape__', '') : block.name,
            input: block.input || {},
            isMcp
          });
        }
      }
    }
    // Handle tool_use_result in both array and object forms
    if (event.type === 'user') {
      const tur = event.tool_use_result;
      if (Array.isArray(tur)) {
        for (const result of tur) {
          if (result.type === 'text' && result.text) {
            toolResults.push({ toolUseId: '', content: result.text });
          }
        }
      } else if (tur && typeof tur === 'object') {
        const content = (tur as Record<string, unknown>).content;
        if (typeof content === 'string') {
          toolResults.push({ toolUseId: '', content });
        } else if (Array.isArray(content)) {
          for (const item of content) {
            if (typeof item === 'object' && item && (item as Record<string, unknown>).text) {
              toolResults.push({ toolUseId: '', content: String((item as Record<string, unknown>).text) });
            }
          }
        }
      }
    }
  }

  // Token counts from modelUsage
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  if (resultEvent?.modelUsage) {
    for (const usage of Object.values(resultEvent.modelUsage)) {
      totalInputTokens +=
        (usage.inputTokens || 0) + (usage.cacheReadInputTokens || 0) + (usage.cacheCreationInputTokens || 0);
      totalOutputTokens += usage.outputTokens || 0;
    }
  }

  const finalResponse = resultEvent?.result || '';
  const durationMs = resultEvent?.duration_ms || 0;
  const costUsd = resultEvent?.total_cost_usd || 0;
  const numTurns = resultEvent?.num_turns || 0;
  const isError = resultEvent?.is_error || false;

  // Score the result
  const scoringNotes: string[] = [];
  const scores = scoreResult({
    testCase,
    mcpConnected,
    mcpToolsAvailable,
    toolCalls,
    finalResponse,
    totalOutputTokens,
    isError,
    scoringNotes
  });

  return {
    testCase,
    mcpConnected,
    mcpToolsAvailable,
    toolCalls,
    toolResults,
    finalResponse,
    durationMs,
    costUsd,
    numTurns,
    totalInputTokens,
    totalOutputTokens,
    isError,
    rawEvents: events,
    scores,
    scoringNotes
  };
};

// ─── Scoring ───────────────────────────────────────────────────────────────────

const scoreResult = ({
  testCase,
  mcpConnected,
  mcpToolsAvailable,
  toolCalls,
  finalResponse,
  totalOutputTokens,
  isError,
  scoringNotes
}: {
  testCase: TestCase;
  mcpConnected: boolean;
  mcpToolsAvailable: string[];
  toolCalls: ToolCall[];
  finalResponse: string;
  totalOutputTokens: number;
  isError: boolean;
  scoringNotes: string[];
}): TestResult['scores'] => {
  // 1. MCP Activation (0/1)
  let mcpActivation = 0;
  if (testCase.expectedTools.length === 0) {
    mcpActivation = 1; // negative tests: activation not required
    scoringNotes.push('Negative test - MCP activation not expected');
  } else if (mcpConnected && mcpToolsAvailable.length >= 4) {
    mcpActivation = 1;
    scoringNotes.push('MCP server connected with all 4 tools available');
  } else {
    scoringNotes.push(
      `MCP server ${mcpConnected ? 'connected' : 'FAILED'}, ${mcpToolsAvailable.length} tools available`
    );
  }

  // 2. Tool Selection (0-3)
  let toolSelection = 0;
  const mcpCalls = toolCalls.filter((tc) => tc.isMcp);
  const nonMcpCalls = toolCalls.filter((tc) => !tc.isMcp);
  const calledToolNames = mcpCalls.map((tc) => tc.name);

  if (nonMcpCalls.length > 0 && testCase.expectedTools.length > 0) {
    scoringNotes.push(`Used non-MCP tools instead: ${nonMcpCalls.map((tc) => tc.name).join(', ')}`);
  }

  if (testCase.expectedTools.length === 0) {
    // Negative test: should NOT call any MCP tools
    if (calledToolNames.length === 0) {
      toolSelection = 3;
      scoringNotes.push('Correctly avoided MCP tools');
    } else {
      toolSelection = 0;
      scoringNotes.push(`WRONG: Called MCP tools when none expected: ${calledToolNames.join(', ')}`);
    }
  } else {
    const expectedSet = new Set(testCase.expectedTools);
    const calledSet = new Set(calledToolNames);
    const correctCalls = [...expectedSet].filter((t) => calledSet.has(t));
    const extraCalls = [...calledSet].filter((t) => !expectedSet.has(t));
    const missedCalls = [...expectedSet].filter((t) => !calledSet.has(t));

    if (correctCalls.length === expectedSet.size && extraCalls.length === 0) {
      toolSelection = 3;
      scoringNotes.push(`Perfect tool selection: ${calledToolNames.join(', ')}`);
    } else if (correctCalls.length > 0) {
      toolSelection = 2;
      if (missedCalls.length > 0) scoringNotes.push(`Missed tools: ${missedCalls.join(', ')}`);
      if (extraCalls.length > 0) scoringNotes.push(`Extra tools called: ${extraCalls.join(', ')}`);
    } else if (calledToolNames.length > 0) {
      // Called some MCP tool but wrong one
      toolSelection = 1;
      scoringNotes.push(
        `Wrong tool selection: called ${calledToolNames.join(', ')}, expected ${testCase.expectedTools.join(', ')}`
      );
    } else {
      toolSelection = 0;
      scoringNotes.push(`No MCP tools called. Expected: ${testCase.expectedTools.join(', ')}`);
    }

    // Check params if specified
    if (testCase.expectedParams && toolCalls.length > 0) {
      const firstCall = toolCalls[0];
      const paramMatches = Object.entries(testCase.expectedParams).filter(
        ([key, value]) => firstCall.input[key] === value
      );
      if (paramMatches.length === Object.keys(testCase.expectedParams).length) {
        scoringNotes.push('Parameters match expected values');
      } else {
        const missing = Object.entries(testCase.expectedParams)
          .filter(([key, value]) => firstCall.input[key] !== value)
          .map(([key, value]) => `${key}=${value} (got: ${firstCall.input[key]})`);
        scoringNotes.push(`Parameter mismatch: ${missing.join(', ')}`);
        toolSelection = Math.max(toolSelection - 1, 0);
      }
    }
  }

  // 3. Response Quality (0-3) - automated heuristics
  let responseQuality = 0;
  if (isError) {
    responseQuality = 0;
    scoringNotes.push('Response is an error');
  } else if (finalResponse.length === 0) {
    responseQuality = 0;
    scoringNotes.push('Empty response');
  } else {
    responseQuality = 1; // base: non-empty response

    // Check for Stacktape-relevant content in docs tests
    if (testCase.category === 'docs' || testCase.category === 'compound' || testCase.category === 'vague') {
      const hasConfig =
        finalResponse.includes('stacktape') ||
        finalResponse.includes('resources') ||
        finalResponse.includes('config') ||
        finalResponse.includes('deploy');
      if (hasConfig) {
        responseQuality++;
        scoringNotes.push('Response contains relevant Stacktape content');
      }

      const hasCodeBlock = finalResponse.includes('```');
      if (
        hasCodeBlock &&
        (testCase.prompt.includes('config') || testCase.prompt.includes('example') || testCase.prompt.includes('show'))
      ) {
        responseQuality++;
        scoringNotes.push('Response includes code examples');
      } else if (responseQuality < 3) {
        responseQuality++;
        scoringNotes.push('Response appears substantive');
      }
    } else if (testCase.category === 'negative') {
      responseQuality = 3; // non-empty, correct non-MCP response
      scoringNotes.push('Valid response for non-Stacktape question');
    } else {
      responseQuality = 2; // ops/diagnose - we got a response
      scoringNotes.push('Got response from ops/diagnose command');
    }
  }

  // 4. Token Efficiency (0-3)
  let tokenEfficiency = 0;
  if (totalOutputTokens <= 200) {
    tokenEfficiency = 3;
    scoringNotes.push(`Very concise: ${totalOutputTokens} output tokens`);
  } else if (totalOutputTokens <= 500) {
    tokenEfficiency = 2;
    scoringNotes.push(`Reasonable: ${totalOutputTokens} output tokens`);
  } else if (totalOutputTokens <= 1000) {
    tokenEfficiency = 1;
    scoringNotes.push(`Verbose: ${totalOutputTokens} output tokens`);
  } else {
    tokenEfficiency = 0;
    scoringNotes.push(`Very verbose: ${totalOutputTokens} output tokens`);
  }

  // Weighted total (out of 10)
  const total =
    mcpActivation * 1 + // 1 point
    toolSelection * 1.5 + // 4.5 points max
    responseQuality * 1 + // 3 points max
    tokenEfficiency * 0.5; // 1.5 points max

  return { mcpActivation, toolSelection, responseQuality, tokenEfficiency, total };
};

// ─── Report Generation ─────────────────────────────────────────────────────────

const generateReport = (results: TestResult[]): string => {
  const lines: string[] = [];

  lines.push('# Stacktape MCP Server Test Report');
  lines.push(`\nGenerated: ${new Date().toISOString()}`);
  lines.push(`CLI: Claude Code v2.1.32`);
  lines.push(`Model: claude-sonnet-4-5-20250929`);
  lines.push(`Tests: ${results.length}`);
  lines.push('');

  // Summary stats
  const avgScore = results.reduce((sum, r) => sum + r.scores.total, 0) / results.length;
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.durationMs, 0);
  const mcpConnectRate = results.filter((r) => r.mcpConnected).length / results.length;
  const toolSelectionRate = results.filter((r) => r.scores.toolSelection >= 2).length / results.length;

  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Average Score | **${avgScore.toFixed(1)}** / 10 |`);
  lines.push(`| MCP Connect Rate | ${(mcpConnectRate * 100).toFixed(0)}% |`);
  lines.push(`| Tool Selection Accuracy | ${(toolSelectionRate * 100).toFixed(0)}% |`);
  lines.push(`| Total Cost | $${totalCost.toFixed(4)} |`);
  lines.push(`| Total Duration | ${(totalDuration / 1000).toFixed(1)}s |`);
  lines.push(`| Avg Cost/Test | $${(totalCost / results.length).toFixed(4)} |`);
  lines.push(`| Avg Duration/Test | ${(totalDuration / results.length / 1000).toFixed(1)}s |`);
  lines.push('');

  // Results table
  lines.push('## Results by Test Case');
  lines.push('');
  lines.push('| ID | Category | MCP | Tool | Quality | Tokens | Score | Cost | Duration | Tools Called |');
  lines.push('|----|----------|-----|------|---------|--------|-------|------|----------|-------------|');

  for (const r of results) {
    const mcpTools = r.toolCalls
      .filter((tc) => tc.isMcp)
      .map((tc) => tc.name)
      .join(', ');
    const otherTools = r.toolCalls
      .filter((tc) => !tc.isMcp)
      .map((tc) => tc.name)
      .join(', ');
    const toolsDisplay =
      [mcpTools && `MCP: ${mcpTools}`, otherTools && `Other: ${otherTools}`].filter(Boolean).join('; ') || '-';
    lines.push(
      `| ${r.testCase.id} | ${r.testCase.category} | ${r.scores.mcpActivation}/1 | ${r.scores.toolSelection}/3 | ${r.scores.responseQuality}/3 | ${r.scores.tokenEfficiency}/3 | **${r.scores.total.toFixed(1)}**/10 | $${r.costUsd.toFixed(4)} | ${(r.durationMs / 1000).toFixed(1)}s | ${toolsDisplay} |`
    );
  }

  lines.push('');

  // Category breakdown
  lines.push('## Scores by Category');
  lines.push('');
  const categories = [...new Set(results.map((r) => r.testCase.category))];
  for (const cat of categories) {
    const catResults = results.filter((r) => r.testCase.category === cat);
    const catAvg = catResults.reduce((sum, r) => sum + r.scores.total, 0) / catResults.length;
    lines.push(`- **${cat}**: ${catAvg.toFixed(1)}/10 avg (${catResults.length} tests)`);
  }
  lines.push('');

  // Detailed results
  lines.push('## Detailed Results');
  lines.push('');

  for (const r of results) {
    lines.push(`### ${r.testCase.id}: ${r.testCase.description}`);
    lines.push('');
    lines.push(`**Prompt:** ${r.testCase.prompt}`);
    lines.push('');
    lines.push(`**Expected tools:** ${r.testCase.expectedTools.join(', ') || 'none'}`);
    lines.push('');
    lines.push(`**MCP connected:** ${r.mcpConnected ? 'Yes' : 'NO'}`);
    const mcpToolCalls = r.toolCalls.filter((tc) => tc.isMcp);
    const otherToolCalls = r.toolCalls.filter((tc) => !tc.isMcp);
    lines.push(
      `**MCP tools called:** ${mcpToolCalls.map((tc) => `${tc.name}(${JSON.stringify(tc.input)})`).join(', ') || 'none'}`
    );
    if (otherToolCalls.length > 0) {
      lines.push(
        `**Other tools used:** ${otherToolCalls.map((tc) => `${tc.name}(${JSON.stringify(tc.input).slice(0, 100)})`).join(', ')}`
      );
    }
    lines.push(
      `**Turns:** ${r.numTurns} | **Cost:** $${r.costUsd.toFixed(4)} | **Duration:** ${(r.durationMs / 1000).toFixed(1)}s | **Output tokens:** ${r.totalOutputTokens}`
    );
    lines.push('');

    lines.push('**Scoring notes:**');
    for (const note of r.scoringNotes) {
      lines.push(`- ${note}`);
    }
    lines.push('');

    lines.push('<details>');
    lines.push('<summary>Response (click to expand)</summary>');
    lines.push('');
    lines.push('```');
    lines.push(r.finalResponse.slice(0, 2000));
    if (r.finalResponse.length > 2000) lines.push('... [truncated]');
    lines.push('```');
    lines.push('</details>');

    if (r.toolResults.length > 0) {
      lines.push('');
      lines.push('<details>');
      lines.push('<summary>MCP Tool Results (click to expand)</summary>');
      lines.push('');
      for (const tr of r.toolResults) {
        lines.push('```json');
        lines.push(tr.content.slice(0, 3000));
        if (tr.content.length > 3000) lines.push('... [truncated]');
        lines.push('```');
      }
      lines.push('</details>');
    }

    lines.push('');
    lines.push('---');
    lines.push('');
  }

  // Recommendations section
  lines.push('## Observations & Recommendations');
  lines.push('');
  lines.push('*Review the detailed results above and add observations here.*');
  lines.push('');

  // MCP tool description analysis
  const noMcpCalls = results.filter((r) => r.testCase.expectedTools.length > 0 && r.toolCalls.length === 0);
  if (noMcpCalls.length > 0) {
    lines.push(`### Tool Selection Failures (${noMcpCalls.length} tests)`);
    lines.push('');
    lines.push('These tests expected MCP tool usage but no MCP tool was called:');
    for (const r of noMcpCalls) {
      lines.push(`- **${r.testCase.id}**: "${r.testCase.prompt}" → expected ${r.testCase.expectedTools.join(', ')}`);
    }
    lines.push('');
    lines.push('This may indicate the tool descriptions need improvement for these scenarios.');
    lines.push('');
  }

  const wrongTools = results.filter((r) => r.scores.toolSelection === 1);
  if (wrongTools.length > 0) {
    lines.push(`### Wrong Tool Selected (${wrongTools.length} tests)`);
    lines.push('');
    for (const r of wrongTools) {
      lines.push(
        `- **${r.testCase.id}**: Called ${r.toolCalls.map((tc) => tc.name).join(', ')}, expected ${r.testCase.expectedTools.join(', ')}`
      );
    }
    lines.push('');
  }

  const falsePositives = results.filter((r) => r.testCase.expectedTools.length === 0 && r.toolCalls.length > 0);
  if (falsePositives.length > 0) {
    lines.push(`### False Positive MCP Calls (${falsePositives.length} tests)`);
    lines.push('');
    lines.push('These tests should NOT have triggered MCP tools but did:');
    for (const r of falsePositives) {
      lines.push(
        `- **${r.testCase.id}**: "${r.testCase.prompt}" → called ${r.toolCalls.map((tc) => tc.name).join(', ')}`
      );
    }
    lines.push('');
  }

  return lines.join('\n');
};

// ─── Main ──────────────────────────────────────────────────────────────────────

const main = async () => {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const idsArg = args.find((a) => a.startsWith('--ids='));
  const catArg = args.find((a) => a.startsWith('--category='));

  let cases = TEST_CASES;

  if (idsArg) {
    const ids = new Set(idsArg.replace('--ids=', '').split(','));
    cases = cases.filter((tc) => ids.has(tc.id));
  }
  if (catArg) {
    const cat = catArg.replace('--category=', '');
    cases = cases.filter((tc) => tc.category === cat);
  }

  console.info(`\n=== Stacktape MCP Server Test Suite ===`);
  console.info(`Tests to run: ${cases.length}`);
  console.info('');

  if (dryRun) {
    for (const tc of cases) {
      console.info(`  ${tc.id} [${tc.category}] - ${tc.description}`);
      console.info(`    Prompt: "${tc.prompt}"`);
      console.info(`    Expected: ${tc.expectedTools.join(', ') || 'none'}`);
      console.info('');
    }
    return;
  }

  const resultsDir = join('C:/Projects/stacktape/scripts', 'mcp-test-results');
  await mkdir(resultsDir, { recursive: true });

  const results: TestResult[] = [];

  for (let i = 0; i < cases.length; i++) {
    const tc = cases[i];
    console.info(`[${i + 1}/${cases.length}] Running ${tc.id}: ${tc.description}...`);

    try {
      const events = await runClaudeCode(tc);
      const result = parseResults(tc, events);
      results.push(result);

      // Save raw events for this test
      await writeFile(join(resultsDir, `${tc.id}-raw.json`), JSON.stringify(events, null, 2));

      console.info(
        `  → Score: ${result.scores.total.toFixed(1)}/10 | Tools: ${result.toolCalls.map((tc) => tc.name).join(', ') || 'none'} | Cost: $${result.costUsd.toFixed(4)} | ${(result.durationMs / 1000).toFixed(1)}s`
      );
    } catch (err) {
      console.info(`  → ERROR: ${(err as Error).message}`);
      results.push({
        testCase: tc,
        mcpConnected: false,
        mcpToolsAvailable: [],
        toolCalls: [],
        toolResults: [],
        finalResponse: `Error: ${(err as Error).message}`,
        durationMs: 0,
        costUsd: 0,
        numTurns: 0,
        totalInputTokens: 0,
        totalOutputTokens: 0,
        isError: true,
        rawEvents: [],
        scores: { mcpActivation: 0, toolSelection: 0, responseQuality: 0, tokenEfficiency: 0, total: 0 },
        scoringNotes: [`Test error: ${(err as Error).message}`]
      });
    }
  }

  // Generate report
  const report = generateReport(results);
  const reportPath = join(resultsDir, 'report.md');
  await writeFile(reportPath, report);

  // Also save structured results
  const structuredPath = join(resultsDir, 'results.json');
  await writeFile(
    structuredPath,
    JSON.stringify(
      results.map((r) => ({
        id: r.testCase.id,
        category: r.testCase.category,
        prompt: r.testCase.prompt,
        expectedTools: r.testCase.expectedTools,
        toolsCalled: r.toolCalls.map((tc) => tc.name),
        scores: r.scores,
        scoringNotes: r.scoringNotes,
        costUsd: r.costUsd,
        durationMs: r.durationMs,
        numTurns: r.numTurns,
        totalOutputTokens: r.totalOutputTokens,
        responsePreview: r.finalResponse.slice(0, 500)
      })),
      null,
      2
    )
  );

  console.info(`\n=== Test Suite Complete ===`);
  console.info(`Report: ${reportPath}`);
  console.info(`Results JSON: ${structuredPath}`);
  console.info(`Raw events: ${resultsDir}/<test-id>-raw.json`);

  // Quick summary
  const avgScore = results.reduce((sum, r) => sum + r.scores.total, 0) / results.length;
  const totalCost = results.reduce((sum, r) => sum + r.costUsd, 0);
  console.info(`\nAvg Score: ${avgScore.toFixed(1)}/10 | Total Cost: $${totalCost.toFixed(4)}`);
};

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
