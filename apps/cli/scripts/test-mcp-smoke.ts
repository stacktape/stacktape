import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const EXPECTED_TOOLS = ['stacktape_cli', 'stacktape_dev', 'stacktape_docs', 'stacktape_project'];

type ToolEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  data?: Record<string, unknown>;
  references?: unknown[];
  answer?: string;
};

type ToolCallResultContent = {
  type: string;
  text?: string;
};

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const getToolText = (result: Awaited<ReturnType<Client['callTool']>>): string => {
  if (!('content' in result)) {
    throw new Error('Tool result did not include content.');
  }
  const content = result.content as ToolCallResultContent[];
  const firstText = content.find((item) => item.type === 'text');
  if (!firstText?.text) {
    throw new Error('Tool result did not include text content.');
  }
  return firstText.text;
};

const callJsonTool = async (
  client: Client,
  name: string,
  args: Record<string, unknown>,
  timeout = 15000
): Promise<ToolEnvelope> => {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout });
  const text = getToolText(result);
  try {
    return JSON.parse(text) as ToolEnvelope;
  } catch {
    throw new Error(`Tool ${name} did not return JSON text: ${text.slice(0, 500)}`);
  }
};

const stderrChunks: string[] = [];
const client = new Client({ name: 'stacktape-mcp-smoke', version: '0.0.0' }, { capabilities: {} });

const parseTransportArgs = () => {
  const rawArgs = process.env.MCP_SMOKE_ARGS_JSON;
  if (!rawArgs) {
    return ['scripts/dev.ts', 'mcp', '--logLevel', 'error'];
  }

  const parsed = JSON.parse(rawArgs) as unknown;
  if (!Array.isArray(parsed) || parsed.some((arg) => typeof arg !== 'string')) {
    throw new Error('MCP_SMOKE_ARGS_JSON must be a JSON array of strings.');
  }

  return parsed;
};

const transport = new StdioClientTransport({
  command: process.env.MCP_SMOKE_COMMAND || 'bun',
  args: parseTransportArgs(),
  cwd: process.env.MCP_SMOKE_CWD || process.cwd(),
  stderr: 'pipe'
});

transport.stderr?.on('data', (chunk) => {
  stderrChunks.push(String(chunk));
});

const main = async () => {
  await client.connect(transport, { timeout: 60000 });

  const listedTools = await client.listTools(undefined, { timeout: 15000 });
  const toolNames = listedTools.tools.map((tool) => tool.name).sort();
  assert(
    JSON.stringify(toolNames) === JSON.stringify([...EXPECTED_TOOLS].sort()),
    `Unexpected tool list: ${toolNames.join(', ')}`
  );

  const docsSearch = await callJsonTool(client, 'stacktape_docs', {
    action: 'search',
    query: 'lambda function timeout property',
    mode: 'reference',
    maxItems: 1
  });
  assert(docsSearch.references?.length === 1, 'Docs search should return one reference.');

  const firstReference = docsSearch.references?.[0] as { route?: string } | undefined;
  assert(firstReference?.route, 'Docs search reference should include a route.');

  const docsGet = await callJsonTool(client, 'stacktape_docs', {
    action: 'get',
    route: firstReference.route,
    maxChars: 4000
  });
  assert(docsGet.ok === true, 'Docs get should return OK.');
  assert(typeof docsGet.data?.content === 'string', 'Docs get should include content.');

  const propertyDocsGet = await callJsonTool(client, 'stacktape_docs', {
    action: 'get',
    route: firstReference.route,
    propertyName: 'timeout',
    maxChars: 4000
  });
  assert(propertyDocsGet.ok === true, 'Docs get should support propertyName.');
  assert(
    typeof propertyDocsGet.data?.content === 'string' && propertyDocsGet.data.content.includes('timeout?: number'),
    'Property docs get should include the timeout property.'
  );

  const definitionFallbackDocsGet = await callJsonTool(client, 'stacktape_docs', {
    action: 'get',
    route: firstReference.route,
    definitionName: 'timeout',
    maxChars: 4000
  });
  assert(definitionFallbackDocsGet.ok === true, 'Docs get should tolerate property names in definitionName.');
  assert(
    definitionFallbackDocsGet.data?.selectorFallback === 'definitionName-as-propertyName',
    'Docs get should report definitionName-as-propertyName fallback.'
  );

  const cliList = await callJsonTool(client, 'stacktape_cli', { action: 'list', category: 'deployment' });
  const listedCommands = cliList.data?.commands as Array<{ command?: string }> | undefined;
  assert(
    listedCommands?.some((command) => command.command === 'deploy'),
    'CLI list should include deploy.'
  );

  const cliDescribe = await callJsonTool(client, 'stacktape_cli', { action: 'describe', command: 'deploy' });
  assert(cliDescribe.ok === true, 'CLI describe should return OK.');
  assert(cliDescribe.data?.safety === 'mutating', 'Deploy should be classified as mutating.');

  const cliPlan = await callJsonTool(client, 'stacktape_cli', {
    action: 'plan',
    command: 'diff',
    stage: 'production',
    region: 'eu-west-1',
    projectName: 'docs'
  });
  assert(cliPlan.ok === true, 'CLI plan should return OK for diff.');
  assert(cliPlan.data?.command === 'diff', 'CLI plan should target diff.');
  assert(
    (cliPlan.data?.args as Record<string, unknown> | undefined)?.configPath === 'stacktape.ts',
    'CLI plan should infer configPath.'
  );

  const blockedDeploy = await callJsonTool(client, 'stacktape_cli', {
    action: 'run',
    command: 'deploy',
    args: { stage: 'dev', region: 'us-east-1' }
  });
  assert(blockedDeploy.ok === false, 'Deploy without confirm should be blocked.');
  assert(blockedDeploy.code === 'CONFIRMATION_REQUIRED', 'Deploy without confirm should require confirmation.');

  const rejectedDev = await callJsonTool(client, 'stacktape_cli', {
    action: 'run',
    command: 'dev',
    args: { stage: 'dev', region: 'us-east-1' },
    confirm: true
  });
  assert(rejectedDev.ok === false, 'Generic CLI runner should reject dev.');
  assert(rejectedDev.code === 'UNSUPPORTED_COMMAND', 'Generic CLI runner should reject interactive commands.');

  const projectScan = await callJsonTool(client, 'stacktape_project', { action: 'scan', maxFiles: 20 });
  assert(projectScan.ok === true, 'Project scan should return OK.');
  assert(Array.isArray(projectScan.data?.configCandidates), 'Project scan should return config candidates.');

  const deployPlan = await callJsonTool(client, 'stacktape_cli', {
    action: 'plan',
    command: 'deploy',
    stage: 'production',
    region: 'eu-west-1',
    projectName: 'docs'
  });
  assert(deployPlan.ok === true, 'Deploy plan should return OK when stage and region are provided.');
  assert(deployPlan.data?.command === 'deploy', 'Deploy plan should target deploy command.');
  assert(
    (deployPlan.data?.args as Record<string, unknown> | undefined)?.projectName === 'docs',
    'Deploy plan should preserve projectName.'
  );

  const summary = JSON.stringify(
    {
      ok: true,
      tools: toolNames,
      checks: [
        'listTools',
        'docs_search',
        'docs_get',
        'docs_get_property',
        'docs_get_definition_property_fallback',
        'cli_list',
        'cli_describe',
        'cli_plan',
        'cli_run_confirmation_gate',
        'cli_run_interactive_rejection',
        'project_scan',
        'deploy_plan'
      ]
    },
    null,
    2
  );
  process.stdout.write(`${summary}\n`);
};

main()
  .catch((error) => {
    const stderr = stderrChunks.join('');
    if (stderr) {
      console.error(stderr);
    }
    throw error;
  })
  .finally(async () => {
    await client.close().catch(() => {});
  });
