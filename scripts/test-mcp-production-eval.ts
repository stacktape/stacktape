import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

type ToolEnvelope = {
  ok?: boolean;
  code?: string;
  message?: string;
  answer?: string;
  data?: Record<string, unknown>;
  references?: Array<Record<string, unknown>>;
  snippets?: Array<Record<string, unknown>>;
  nextActions?: string[];
};

type EvalCase = {
  id: string;
  tool: string;
  args: Record<string, unknown>;
  assert: (result: ToolEnvelope) => void | Promise<void>;
};

const EXPECTED_TOOLS = ['stacktape_cli', 'stacktape_dev', 'stacktape_docs', 'stacktape_project'].sort();

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

const textOf = (result: Awaited<ReturnType<Client['callTool']>>): string => {
  if (!('content' in result)) throw new Error('Tool result did not include content.');
  const content = result.content as Array<{ type: string; text?: string }>;
  const text = content.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('Tool result did not include text content.');
  return text;
};

const callJsonTool = async (client: Client, tool: string, args: Record<string, unknown>): Promise<ToolEnvelope> => {
  const result = await client.callTool({ name: tool, arguments: args }, undefined, { timeout: 30000 });
  const text = textOf(result);
  try {
    return JSON.parse(text) as ToolEnvelope;
  } catch {
    throw new Error(`Tool ${tool} did not return JSON. First 500 chars:\n${text.slice(0, 500)}`);
  }
};

const includes = (value: unknown, pattern: RegExp | string): boolean => {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
};

const createTempStacktapeProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-prod-eval-'));
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: 'prod-eval-app',
        packageManager: 'bun@1.3.9',
        scripts: {
          deploy: 'stacktape deploy --region us-east-1 --stage prod --projectName prod-eval-app',
          preview: 'stacktape diff --region us-east-1 --stage prod'
        },
        dependencies: {
          stacktape: '3.7.0'
        }
      },
      null,
      2
    )
  );
  await writeFile(
    join(cwd, 'stacktape.ts'),
    `import { defineConfig, LambdaFunction, StacktapeLambdaBuildpackPackaging } from 'stacktape';

export default defineConfig(() => {
  const api = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/handler.ts'
    }),
    timeout: 30
  });

  return { resources: { api } };
});
`
  );
  return cwd;
};

const createTempStacktapeProjectWithoutDeployScript = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-prod-eval-no-deploy-'));
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: 'prod-eval-no-deploy',
        scripts: {
          build: 'echo build'
        },
        dependencies: {
          stacktape: '3.7.0'
        }
      },
      null,
      2
    )
  );
  await writeFile(
    join(cwd, 'stacktape.ts'),
    `import { defineConfig } from 'stacktape';

export default defineConfig(() => ({ resources: {} }));
`
  );
  return cwd;
};

const createTempDeployScriptChoiceProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-prod-eval-choice-'));
  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify(
      {
        name: 'prod-eval-choice',
        scripts: {
          deploy: 'stacktape deploy --region us-east-1 --stage dev --projectName prod-eval-choice',
          'deploy:prod':
            'stacktape deploy --region eu-central-1 --stage prod --projectName prod-eval-choice --aa prod-account',
          'deploy:staging': 'stacktape deploy --region us-west-2 --stage staging --projectName prod-eval-choice'
        },
        dependencies: {
          stacktape: '3.7.0'
        }
      },
      null,
      2
    )
  );
  await writeFile(
    join(cwd, 'stacktape.ts'),
    `import { defineConfig, Bucket } from 'stacktape';

export default defineConfig(() => ({
  resources: {
    assets: new Bucket({})
  }
}));
`
  );
  return cwd;
};

const main = async () => {
  const tempProjectCwd = await createTempStacktapeProject();
  const tempNoDeployProjectCwd = await createTempStacktapeProjectWithoutDeployScript();
  const tempDeployScriptChoiceCwd = await createTempDeployScriptChoiceProject();
  const tempEmptyCwd = await mkdtemp(join(tmpdir(), 'stacktape-mcp-prod-eval-empty-'));
  const cases: EvalCase[] = [
    {
      id: 'docs-search-lambda-timeout-reference',
      tool: 'stacktape_docs',
      args: {
        action: 'search',
        query: 'lambda function timeout property default',
        resourceType: 'function',
        docKind: 'config-reference',
        mode: 'reference',
        maxItems: 2
      },
      assert: (result) => {
        assert(result.references?.[0]?.route === '/config-reference/function', 'Expected function config reference.');
      }
    },
    {
      id: 'docs-get-property-timeout',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/config-reference/function', propertyName: 'timeout', maxChars: 3000 },
      assert: (result) => {
        assert(result.ok === true, 'Expected docs_get OK.');
        assert(includes(result.data?.content, 'timeout?: number'), 'Expected timeout property.');
        assert(includes(result.data?.content, 'Maximum: 900'), 'Expected timeout maximum.');
      }
    },
    {
      id: 'docs-get-definition-property-fallback',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/config-reference/function', definitionName: 'timeout', maxChars: 3000 },
      assert: (result) => {
        assert(result.ok === true, 'Expected fallback OK.');
        assert(result.data?.selectorFallback === 'definitionName-as-propertyName', 'Expected fallback marker.');
      }
    },
    {
      id: 'docs-get-bad-property-not-found',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/config-reference/function', propertyName: 'definitelyNotARealProperty' },
      assert: (result) => {
        assert(result.ok === false, 'Expected bad property to fail.');
        assert(result.code === 'NOT_FOUND', 'Expected NOT_FOUND.');
      }
    },
    {
      id: 'docs-get-validation',
      tool: 'stacktape_docs',
      args: { action: 'get' },
      assert: (result) => {
        assert(result.ok === false, 'Expected validation failure.');
        assert(result.code === 'VALIDATION_ERROR', 'Expected VALIDATION_ERROR.');
      }
    },
    {
      id: 'docs-search-nextjs-workflow',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'deploy Next.js app with Stacktape', mode: 'reference', maxItems: 4 },
      assert: (result) => {
        assert(
          result.references?.some((ref) => ref.route === '/resources/frontend/nextjs'),
          'Expected Next.js docs.'
        );
      }
    },
    {
      id: 'docs-search-relational-db-reference',
      tool: 'stacktape_docs',
      args: {
        action: 'search',
        query: 'relational database engine postgres property',
        resourceType: 'relational-database',
        docKind: 'config-reference',
        mode: 'answer',
        maxItems: 2
      },
      assert: (result) => {
        assert(includes(result.answer, 'Relational'), 'Expected relational database reference answer.');
      }
    },
    {
      id: 'docs-search-cli-debug-logs',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'CLI command view lambda logs debug logs', mode: 'reference', maxItems: 4 },
      assert: (result) => {
        assert(
          result.references?.some((ref) => ['/cli/logs', '/cli/debug-logs'].includes(String(ref.route))),
          'Expected logs.'
        );
      }
    },
    {
      id: 'docs-search-secrets-env-vars',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'use secrets in environment variables', mode: 'reference', maxItems: 4 },
      assert: (result) => {
        assert(
          result.references?.some(
            (ref) => ref.route === '/configuration/secrets' || ref.route === '/configuration/directives'
          ),
          'Expected secrets or directives docs.'
        );
      }
    },
    {
      id: 'docs-search-custom-domain-web-service',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'custom domain web service', mode: 'reference', maxItems: 4 },
      assert: (result) => {
        assert(
          result.references?.some(
            (ref) => String(ref.route).includes('custom-domains') || ref.route === '/config-reference/web-service'
          ),
          'Expected custom domain docs.'
        );
      }
    },
    {
      id: 'docs-search-s3-referenceable-params',
      tool: 'stacktape_docs',
      args: {
        action: 'search',
        query: 'S3 bucket referenceable params arn name',
        resourceType: 'bucket',
        mode: 'answer',
        maxItems: 3
      },
      assert: (result) => {
        assert(includes(result.answer, /arn|name|bucket/i), 'Expected bucket referenceable params content.');
      }
    },
    {
      id: 'docs-get-route-without-leading-slash',
      tool: 'stacktape_docs',
      args: { action: 'get', route: 'config-reference/function', propertyName: 'memory', maxChars: 3000 },
      assert: (result) => {
        assert(result.ok === true, 'Expected route normalization.');
        assert(includes(result.data?.content, 'memory?: number'), 'Expected memory property.');
      }
    },
    {
      id: 'docs-get-definition-name',
      tool: 'stacktape_docs',
      args: { action: 'get', definitionName: 'LambdaFunction', maxChars: 3000 },
      assert: (result) => {
        assert(result.ok === true, 'Expected definition lookup.');
        assert(includes(result.data?.content, 'LambdaFunction'), 'Expected LambdaFunction content.');
      }
    },
    {
      id: 'docs-snippet-fallback-without-code',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'duplicate GitHub webhook self hosted runners', mode: 'snippet', maxItems: 2 },
      assert: (result) => {
        assert(Array.isArray(result.snippets) && result.snippets.length > 0, 'Expected snippet fallback.');
        assert(
          result.snippets.some((snippet) => snippet.language === 'markdown'),
          'Expected markdown fallback snippet.'
        );
      }
    },
    {
      id: 'docs-search-empty-query',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'the and of to', mode: 'reference', maxItems: 5 },
      assert: (result) => {
        assert(result.references?.length === 0, 'Expected stop-word-only query to return no docs.');
        assert(includes(result.answer, 'No relevant documentation'), 'Expected no-docs answer.');
      }
    },
    {
      id: 'docs-search-clamps-negative-max-items',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'lambda function timeout property', mode: 'reference', maxItems: -10 },
      assert: (result) => {
        assert(result.references?.length === 1, 'Expected negative maxItems to clamp to one result.');
      }
    },
    {
      id: 'docs-search-clamps-huge-max-items',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'function resource property', mode: 'snippet', maxItems: 500 },
      assert: (result) => {
        assert((result.references?.length || 0) <= 20, 'Expected huge maxItems to clamp.');
        assert((result.snippets?.length || 0) <= 20, 'Expected snippet count to clamp.');
      }
    },
    {
      id: 'docs-get-source-path-selector',
      tool: 'stacktape_docs',
      args: {
        action: 'get',
        sourcePath: 'types/stacktape-config/functions.d.ts',
        propertyName: 'memory',
        maxChars: 3000
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected sourcePath selector OK.');
        assert(includes(result.data?.content, 'memory?: number'), 'Expected memory property from sourcePath.');
      }
    },
    {
      id: 'docs-get-heading-path-selector',
      tool: 'stacktape_docs',
      args: {
        action: 'get',
        route: '/configuration/connecting-resources',
        headingPath: ['Connecting Resources', 'Injected variables', 'Relational database'],
        maxChars: 3000
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected headingPath selector OK.');
        assert(
          includes(result.data?.content, 'STP_MY_DATABASE_CONNECTION_STRING'),
          'Expected exact DB env var section.'
        );
        assert(!includes(result.data?.content, 'Script-only variables'), 'Expected only selected heading section.');
      }
    },
    {
      id: 'docs-get-doc-kind-mismatch',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/config-reference/function', docKind: 'docs-page' },
      assert: (result) => {
        assert(result.ok === false, 'Expected docKind mismatch to fail.');
        assert(result.code === 'NOT_FOUND', 'Expected NOT_FOUND for docKind mismatch.');
      }
    },
    {
      id: 'docs-get-long-route-asks-for-heading',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/resources/databases/relational-database', maxChars: 16000 },
      assert: (result) => {
        assert(result.ok === true, 'Expected long route selector to return OK.');
        assert(result.code === 'MULTIPLE_SECTIONS', 'Expected long route selector to ask for headingPath.');
        assert(Array.isArray(result.data?.availableHeadingPaths), 'Expected available heading paths.');
        assert(!result.data?.content, 'Expected no full content dump for long route selector.');
      }
    },
    {
      id: 'docs-get-maxchars-clamped-json',
      tool: 'stacktape_docs',
      args: { action: 'get', route: '/config-reference/function', maxChars: 999999 },
      assert: (result) => {
        assert(result.ok === true, 'Expected maxChars clamp to still return valid JSON.');
        assert(typeof result.data?.content === 'string', 'Expected content string.');
        assert(
          String(result.data.content).length <= 22000,
          'Expected content to be clamped before JSON serialization.'
        );
      }
    },
    {
      id: 'docs-search-impossible-filter',
      tool: 'stacktape_docs',
      args: {
        action: 'search',
        query: 'lambda function',
        resourceType: 'not-a-real-resource-type',
        mode: 'reference',
        maxItems: 5
      },
      assert: (result) => {
        assert(result.references?.length === 0, 'Expected impossible resource filter to return no docs.');
      }
    },
    {
      id: 'docs-search-database-connection-workflow',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'connect lambda function to postgres database', mode: 'reference', maxItems: 6 },
      assert: (result) => {
        assert(
          result.references?.some(
            (ref) =>
              ref.resourceType === 'relational-database' ||
              ref.resourceType === 'function' ||
              ref.route === '/resources/databases/relational-database' ||
              ref.route === '/resources/compute/lambda-function'
          ),
          'Expected function or relational database docs.'
        );
      }
    },
    {
      id: 'docs-search-scheduled-job-workflow',
      tool: 'stacktape_docs',
      args: { action: 'search', query: 'run scheduled cron job every day', mode: 'reference', maxItems: 6 },
      assert: (result) => {
        assert(
          result.references?.some(
            (ref) => String(ref.route).includes('batch') || String(ref.route).includes('schedule')
          ),
          'Expected scheduled job or batch docs.'
        );
      }
    },
    {
      id: 'cli-list-deployment',
      tool: 'stacktape_cli',
      args: { action: 'list', category: 'deployment' },
      assert: (result) => {
        const commands = result.data?.commands as Array<Record<string, unknown>>;
        assert(
          commands.some((command) => command.command === 'deploy'),
          'Expected deploy command.'
        );
        assert(
          commands.some((command) => command.command === 'diff'),
          'Expected diff command.'
        );
      }
    },
    {
      id: 'cli-list-secrets',
      tool: 'stacktape_cli',
      args: { action: 'list', category: 'secrets' },
      assert: (result) => {
        const commands = result.data?.commands as Array<Record<string, unknown>>;
        assert(
          commands.some((command) => command.command === 'secret:set'),
          'Expected secret:set command.'
        );
        assert(
          commands.some((command) => command.command === 'secret:get'),
          'Expected secret:get command.'
        );
        assert(
          commands.some((command) => command.command === 'secret:delete'),
          'Expected secret:delete command.'
        );
      }
    },
    {
      id: 'cli-list-mutating',
      tool: 'stacktape_cli',
      args: { action: 'list', safety: 'mutating' },
      assert: (result) => {
        const commands = result.data?.commands as Array<Record<string, unknown>>;
        assert(
          commands.some((command) => command.command === 'deploy'),
          'Expected deploy in mutating commands.'
        );
        assert(
          commands.every((command) => command.safety === 'mutating'),
          'Expected only mutating commands.'
        );
      }
    },
    {
      id: 'cli-describe-deploy',
      tool: 'stacktape_cli',
      args: { action: 'describe', command: 'deploy' },
      assert: (result) => {
        assert(result.ok === true, 'Expected deploy describe OK.');
        assert(result.data?.safety === 'mutating', 'Expected deploy mutating safety.');
        assert(includes(result.data?.allowedArgs, 'configPath'), 'Expected configPath arg.');
      }
    },
    {
      id: 'cli-describe-unknown-command',
      tool: 'stacktape_cli',
      args: { action: 'describe', command: 'not-a-command' },
      assert: (result) => {
        assert(result.ok === false, 'Expected unknown command failure.');
        assert(result.code === 'UNKNOWN_COMMAND', 'Expected UNKNOWN_COMMAND.');
      }
    },
    {
      id: 'cli-describe-debug-container-exec',
      tool: 'stacktape_cli',
      args: { action: 'describe', command: 'container:exec' },
      assert: (result) => {
        assert(result.ok === true, 'Expected container:exec describe OK.');
        assert(result.data?.safety === 'mutating', 'Expected conservative mutating classification.');
        assert(result.data?.requiresConfirmation === true, 'Expected confirmation requirement.');
      }
    },
    {
      id: 'cli-describe-secret-get-sensitive',
      tool: 'stacktape_cli',
      args: { action: 'describe', command: 'secret:get' },
      assert: (result) => {
        assert(result.ok === true, 'Expected secret:get describe OK.');
        assert(result.data?.sensitiveOutput === true, 'Expected sensitive output marker.');
      }
    },
    {
      id: 'cli-list-diagnostics-readonly',
      tool: 'stacktape_cli',
      args: { action: 'list', category: 'diagnostics', safety: 'readOnly' },
      assert: (result) => {
        const commands = result.data?.commands as Array<Record<string, unknown>>;
        assert(
          commands.some((command) => command.command === 'logs'),
          'Expected logs command.'
        );
        assert(
          commands.some((command) => command.command === 'info:stack'),
          'Expected info:stack command.'
        );
      }
    },
    {
      id: 'cli-describe-dev-interactive',
      tool: 'stacktape_cli',
      args: { action: 'describe', command: 'dev' },
      assert: (result) => {
        assert(result.ok === true, 'Expected dev describe OK.');
        assert(result.data?.safety === 'interactive', 'Expected interactive safety.');
        assert(includes(result.data?.unsupportedReason, 'stacktape_dev'), 'Expected stacktape_dev guidance.');
      }
    },
    {
      id: 'cli-plan-preview-docs-normalized',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'diff',
        stage: 'production',
        region: 'eu-west-1',
        projectName: 'docs'
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected diff plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.awsAccount === 'stacktape-dev', 'Expected deploy script account reused for preview context.');
        assert(args.projectName === 'docs', 'Expected projectName preserved.');
        assert(args.configPath === 'stacktape.ts', 'Expected config path.');
        assert(args.currentWorkingDirectory === 'docs', 'Expected current working directory.');
        assert(!('hotSwap' in args), 'Expected unsupported hotSwap arg dropped for diff.');
        const matched = result.data?.matchedPackageScript as Record<string, unknown>;
        assert(matched.matchKind === 'deploy-context', 'Expected deploy-context package script match.');
      }
    },
    {
      id: 'cli-plan-preview-temp-exact-script',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'diff',
        cwd: tempProjectCwd,
        stage: 'prod',
        projectName: 'prod-eval-app'
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected diff plan OK from exact preview script.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.region === 'us-east-1', 'Expected region inferred from preview script.');
        const matched = result.data?.matchedPackageScript as Record<string, unknown>;
        assert(matched.matchKind === 'exact', 'Expected exact package script match.');
      }
    },
    {
      id: 'cli-plan-debug-sql',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'query:sql',
        stage: 'production',
        region: 'eu-west-1',
        projectName: 'docs',
        resourceName: 'mainDatabase',
        args: { query: 'SELECT 1;' }
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected query:sql plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.resourceName === 'mainDatabase', 'Expected resourceName preserved.');
        assert(args.sql === 'SELECT 1;', 'Expected sql preserved.');
        const policy = result.data?.policy as Record<string, unknown>;
        assert(policy.safety === 'diagnostic', 'Expected diagnostic safety.');
      }
    },
    {
      id: 'cli-plan-secret-create-missing-value',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'secret:set',
        stage: 'production',
        region: 'eu-west-1',
        projectName: 'docs',
        secretName: 'db.password'
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected secret:set without value/file to fail planning.');
        assert(
          result.code === 'MISSING_ARGS' || result.code === 'VALIDATION_ERROR',
          'Expected missing/validation code.'
        );
        assert(includes(result.message, /secret(Value|File)|required/i), 'Expected missing secret value guidance.');
      }
    },
    {
      id: 'cli-plan-secret-get-missing-region-keeps-sensitive-guidance',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'secret:get',
        stage: 'production',
        projectName: 'docs',
        secretName: 'STRIPE_API_KEY'
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected secret:get without region to fail planning.');
        assert(result.code === 'MISSING_ARGS', 'Expected missing args code.');
        assert(includes(result.message, /region/i), 'Expected missing region message.');
        assert(
          includes(result.nextActions, /conversation transcript|cached|logged/i),
          'Expected sensitive-output warning.'
        );
        assert(includes(result.nextActions, /OWN terminal/i), 'Expected own-terminal guidance.');
      }
    },
    {
      id: 'cli-plan-secret-create-value-redacted',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'secret:set',
        stage: 'production',
        region: 'eu-west-1',
        projectName: 'docs',
        secretName: 'db.password',
        secretValue: 'super-secret-password'
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected secret:set plan with value OK.');
        const serialized = JSON.stringify(result);
        assert(
          !serialized.includes('super-secret-password'),
          'Expected secret value to be redacted from planner output.'
        );
        const policy = result.data?.policy as Record<string, unknown>;
        assert(policy.sensitiveOutput === true, 'Expected secret:set to be marked as sensitive output.');
      }
    },
    {
      id: 'cli-plan-dev-interactive-rejected',
      tool: 'stacktape_cli',
      args: { action: 'plan', command: 'dev', stage: 'dev', region: 'us-east-1' },
      assert: (result) => {
        assert(result.ok === false, 'Expected dev plan through generic planner to fail.');
        assert(result.code === 'UNSUPPORTED_COMMAND', 'Expected unsupported command.');
        assert(includes(result.nextActions, 'stacktape_dev'), 'Expected stacktape_dev guidance.');
      }
    },
    {
      id: 'cli-run-mutating-confirmation-gate',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'deploy', args: { stage: 'dev', region: 'us-east-1' } },
      assert: (result) => {
        assert(result.ok === false, 'Expected deploy without confirmation to fail.');
        assert(result.code === 'CONFIRMATION_REQUIRED', 'Expected confirmation gate.');
      }
    },
    {
      id: 'cli-run-destructive-confirmation-gate',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'delete', args: { stage: 'dev', region: 'us-east-1' } },
      assert: (result) => {
        assert(result.ok === false, 'Expected delete without confirmation to fail.');
        assert(result.code === 'CONFIRMATION_REQUIRED', 'Expected destructive confirmation gate.');
      }
    },
    {
      id: 'cli-run-destructive-confirm-true-fails-closed-without-elicitation',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'delete', args: { stage: 'dev', region: 'us-east-1' }, confirm: true },
      assert: (result) => {
        assert(result.ok === false, 'Expected delete with agent-supplied confirm to fail closed.');
        assert(result.code === 'USER_CONFIRMATION_REQUIRED', 'Expected direct user confirmation requirement.');
        assert(includes(result.message, 'elicitation'), 'Expected elicitation guidance.');
        assert(
          includes(result.nextActions, 'agent-supplied confirmation is not sufficient'),
          'Expected agent safety guidance.'
        );
      }
    },
    {
      id: 'cli-run-unknown-command',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'not-a-command' },
      assert: (result) => {
        assert(result.ok === false, 'Expected unknown command to fail.');
        assert(result.code === 'UNKNOWN_COMMAND', 'Expected UNKNOWN_COMMAND.');
      }
    },
    {
      id: 'cli-run-confirmed-deploy-missing-required',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'deploy', args: { region: 'us-east-1' }, confirm: true },
      assert: (result) => {
        assert(result.ok === false, 'Expected deploy missing stage to fail before execution.');
        assert(result.code === 'VALIDATION_ERROR', 'Expected validation error.');
        assert(includes(result.message, 'stage'), 'Expected missing stage message.');
      }
    },
    {
      id: 'cli-run-interactive-rejected',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'dev', args: { stage: 'dev', region: 'us-east-1' }, confirm: true },
      assert: (result) => {
        assert(result.ok === false, 'Expected dev through generic runner to fail.');
        assert(result.code === 'UNSUPPORTED_COMMAND', 'Expected unsupported command.');
      }
    },
    {
      id: 'cli-run-interactive-bastion-rejected',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'bastion:tunnel', args: { stage: 'dev', region: 'us-east-1' }, confirm: true },
      assert: (result) => {
        assert(result.ok === false, 'Expected bastion:tunnel through generic runner to fail.');
        assert(result.code === 'UNSUPPORTED_COMMAND', 'Expected unsupported command.');
      }
    },
    {
      id: 'cli-run-unknown-arg-rejected',
      tool: 'stacktape_cli',
      args: { action: 'run', command: 'diff', args: { stage: 'dev', region: 'us-east-1', badArg: true } },
      assert: (result) => {
        assert(result.ok === false, 'Expected unknown arg to fail.');
        assert(result.code === 'VALIDATION_ERROR', 'Expected validation error.');
      }
    },
    {
      id: 'cli-run-alias-args-normalized-before-validation',
      tool: 'stacktape_cli',
      args: {
        action: 'run',
        command: 'deploy',
        args: { stage: 'prod', region: 'us-east-1', aa: 'prod-account', hs: true }
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected deploy without confirmation to fail.');
        assert(result.code === 'CONFIRMATION_REQUIRED', 'Expected confirmation gate after alias normalization.');
        assert(includes(result.data?.args, 'awsAccount'), 'Expected aa alias normalized.');
        assert(includes(result.data?.args, 'hotSwap'), 'Expected hs alias normalized.');
      }
    },
    {
      id: 'project-scan-repo-ranking',
      tool: 'stacktape_project',
      args: { action: 'scan', maxFiles: 5 },
      assert: (result) => {
        assert(result.ok === true, 'Expected project scan OK.');
        const defaults = result.data?.suggestedDefaults as Record<string, unknown>;
        assert(defaults.currentWorkingDirectory === 'docs', 'Expected docs as suggested working directory.');
        assert(defaults.configPath === 'stacktape.ts', 'Expected stacktape.ts suggested config.');
      }
    },
    {
      id: 'project-scan-temp-project',
      tool: 'stacktape_project',
      args: { action: 'scan', cwd: tempProjectCwd, maxFiles: 5 },
      assert: (result) => {
        assert(result.ok === true, 'Expected temp project scan OK.');
        const defaults = result.data?.suggestedDefaults as Record<string, unknown>;
        assert(defaults.configPath === 'stacktape.ts', 'Expected temp config path.');
        assert(defaults.currentWorkingDirectory === '.', 'Expected temp cwd default.');
        assert(includes(result.data?.configCandidates, 'LambdaFunction'), 'Expected LambdaFunction constructor.');
      }
    },
    {
      id: 'project-scan-missing-cwd',
      tool: 'stacktape_project',
      args: { action: 'scan', cwd: join(tempProjectCwd, 'does-not-exist') },
      assert: (result) => {
        assert(result.ok === false, 'Expected missing cwd to fail.');
        assert(result.code === 'VALIDATION_ERROR', 'Expected validation error.');
      }
    },
    {
      id: 'project-scan-empty-dir',
      tool: 'stacktape_project',
      args: { action: 'scan', cwd: tempEmptyCwd, maxFiles: 10 },
      assert: (result) => {
        assert(result.ok === true, 'Expected empty scan to succeed.');
        assert(result.data?.totalConfigCandidates === 0, 'Expected no config candidates.');
        const defaults = result.data?.suggestedDefaults as Record<string, unknown>;
        assert(defaults.currentWorkingDirectory === '.', 'Expected empty cwd default.');
        assert(defaults.configPath === undefined, 'Expected no config path.');
      }
    },
    {
      id: 'project-scan-clamps-negative-max-files',
      tool: 'stacktape_project',
      args: { action: 'scan', cwd: tempProjectCwd, maxFiles: -20 },
      assert: (result) => {
        assert(result.ok === true, 'Expected scan OK.');
        assert((result.data?.configCandidates as unknown[]).length === 1, 'Expected maxFiles clamp to at least one.');
      }
    },
    {
      id: 'deploy-plan-docs-normalized',
      tool: 'stacktape_cli',
      args: { action: 'plan', command: 'deploy', stage: 'production', region: 'eu-west-1', projectName: 'docs' },
      assert: (result) => {
        assert(result.ok === true, 'Expected deploy plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.awsAccount === 'stacktape-dev', 'Expected --aa normalized to awsAccount.');
        assert(args.hotSwap === true, 'Expected --hs normalized to hotSwap.');
        assert(args.configPath === 'stacktape.ts', 'Expected config path.');
        assert(args.currentWorkingDirectory === 'docs', 'Expected current working directory.');
        assert(!('aa' in args), 'Did not expect aa alias in final args.');
        assert(!('hs' in args), 'Did not expect hs alias in final args.');
        const cliRun = result.data?.stacktapeCliRun as Record<string, unknown>;
        const cliRunArguments = cliRun.arguments as Record<string, unknown>;
        assert(!('confirm' in cliRunArguments), 'Expected planner not to pre-fill agent-supplied confirm.');
      }
    },
    {
      id: 'deploy-plan-infers-region-from-script',
      tool: 'stacktape_cli',
      args: { action: 'plan', command: 'deploy', stage: 'prod', projectName: 'prod-eval-app', cwd: tempProjectCwd },
      assert: (result) => {
        assert(result.ok === true, 'Expected region inferred from matching script.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.region === 'us-east-1', 'Expected inferred region.');
      }
    },
    {
      id: 'deploy-plan-selects-stage-specific-script',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        stage: 'prod',
        projectName: 'prod-eval-choice',
        cwd: tempDeployScriptChoiceCwd
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected stage-specific script plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.region === 'eu-central-1', 'Expected region from deploy:prod script.');
        assert(args.awsAccount === 'prod-account', 'Expected aa alias from script normalized.');
        const matched = result.data?.matchedPackageScript as Record<string, unknown>;
        assert(matched.scriptName === 'deploy:prod', 'Expected deploy:prod script match.');
      }
    },
    {
      id: 'deploy-plan-explicit-overrides-script',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        stage: 'prod',
        region: 'ap-southeast-2',
        projectName: 'prod-eval-choice',
        awsAccount: 'override-account',
        hotSwap: false,
        cwd: tempDeployScriptChoiceCwd
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected explicit override plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.region === 'ap-southeast-2', 'Expected explicit region override.');
        assert(args.awsAccount === 'override-account', 'Expected explicit account override.');
        assert(
          !('hotSwap' in args) || args.hotSwap === false,
          'Expected false hotSwap preserved or omitted from shell only.'
        );
      }
    },
    {
      id: 'deploy-plan-missing-region-without-script',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        stage: 'prod',
        projectName: 'prod-eval-no-deploy',
        cwd: tempNoDeployProjectCwd
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected missing region to fail without deploy script.');
        assert(result.code === 'MISSING_ARGS', 'Expected MISSING_ARGS.');
      }
    },
    {
      id: 'deploy-plan-empty-dir-requires-config',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        cwd: tempEmptyCwd,
        stage: 'prod',
        region: 'us-east-1',
        projectName: 'empty'
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected empty directory plan to fail.');
        assert(result.code === 'MISSING_ARGS', 'Expected missing configPath.');
        assert(includes(result.message, 'configPath'), 'Expected configPath in missing args.');
      }
    },
    {
      id: 'deploy-plan-explicit-config-in-empty-dir',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        cwd: tempEmptyCwd,
        stage: 'prod',
        region: 'us-east-1',
        projectName: 'empty',
        configPath: 'stacktape.ts',
        currentWorkingDirectory: '.'
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected explicit configPath to allow planning.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.configPath === 'stacktape.ts', 'Expected explicit config path.');
      }
    },
    {
      id: 'deploy-plan-temp-project',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        cwd: tempProjectCwd,
        stage: 'prod',
        region: 'us-east-1',
        projectName: 'prod-eval-app'
      },
      assert: (result) => {
        assert(result.ok === true, 'Expected temp deploy plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.configPath === 'stacktape.ts', 'Expected temp config path.');
        assert(args.currentWorkingDirectory === '.', 'Expected temp working directory.');
        assert(args.projectName === 'prod-eval-app', 'Expected projectName.');
      }
    },
    {
      id: 'deploy-plan-missing-cwd',
      tool: 'stacktape_cli',
      args: {
        action: 'plan',
        command: 'deploy',
        cwd: join(tempProjectCwd, 'does-not-exist'),
        stage: 'prod',
        region: 'us-east-1'
      },
      assert: (result) => {
        assert(result.ok === false, 'Expected missing cwd to fail.');
        assert(result.code === 'VALIDATION_ERROR', 'Expected validation error.');
      }
    },
    {
      id: 'dev-status-without-session',
      tool: 'stacktape_dev',
      args: { action: 'status' },
      assert: (result) => {
        assert(result.ok === false, 'Expected no active dev session.');
        assert(result.code === 'NOT_FOUND', 'Expected NOT_FOUND.');
      }
    },
    {
      id: 'dev-plan-docs',
      tool: 'stacktape_dev',
      args: { action: 'plan', args: { projectName: 'docs' } },
      assert: (result) => {
        assert(result.ok === true, 'Expected dev plan OK.');
        const args = result.data?.args as Record<string, unknown>;
        assert(args.region === 'eu-west-1', 'Expected region inferred from docs deploy script.');
        assert(args.stage === 'dev', 'Expected dev stage default.');
        assert(args.configPath === 'stacktape.ts', 'Expected config path.');
        assert(args.currentWorkingDirectory === 'docs', 'Expected current working directory.');
        assert(!('hotSwap' in args), 'Expected deploy-only hotSwap removed.');
      }
    },
    {
      id: 'dev-logs-without-session',
      tool: 'stacktape_dev',
      args: { action: 'logs', args: { limit: 10 } },
      assert: (result) => {
        assert(result.ok === false, 'Expected no active dev session.');
        assert(result.code === 'NOT_FOUND', 'Expected NOT_FOUND.');
      }
    },
    {
      id: 'dev-stop-without-session',
      tool: 'stacktape_dev',
      args: { action: 'stop' },
      assert: (result) => {
        assert(result.ok === false, 'Expected no active dev session.');
        assert(result.code === 'NOT_FOUND', 'Expected NOT_FOUND.');
      }
    }
  ];

  const results: Array<{ id: string; ok: boolean; durationMs: number; error?: string }> = [];
  const stderrChunks: string[] = [];

  const runBatch = async (batch: EvalCase[]) => {
    const client = new Client({ name: 'stacktape-mcp-production-eval', version: '0.0.0' }, { capabilities: {} });
    const transport = new StdioClientTransport({
      command: 'bun',
      args: ['scripts/dev.ts', 'mcp', '--logLevel', 'error'],
      cwd: process.cwd(),
      stderr: 'pipe'
    });

    transport.stderr?.on('data', (chunk) => stderrChunks.push(String(chunk)));

    try {
      await client.connect(transport, { timeout: 60000 });
      const tools = (await client.listTools(undefined, { timeout: 15000 })).tools.map((tool) => tool.name).sort();
      assert(JSON.stringify(tools) === JSON.stringify(EXPECTED_TOOLS), `Unexpected tools: ${tools.join(', ')}`);

      for (const testCase of batch) {
        const startedAt = performance.now();
        try {
          const result = await callJsonTool(client, testCase.tool, testCase.args);
          await testCase.assert(result);
          results.push({ id: testCase.id, ok: true, durationMs: Math.round(performance.now() - startedAt) });
        } catch (error) {
          results.push({
            id: testCase.id,
            ok: false,
            durationMs: Math.round(performance.now() - startedAt),
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    } finally {
      await client.close().catch(() => {});
    }
  };

  try {
    for (let index = 0; index < cases.length; index += 16) {
      await runBatch(cases.slice(index, index + 16));
    }
  } finally {
    await rm(tempProjectCwd, { recursive: true, force: true }).catch(() => {});
    await rm(tempNoDeployProjectCwd, { recursive: true, force: true }).catch(() => {});
    await rm(tempDeployScriptChoiceCwd, { recursive: true, force: true }).catch(() => {});
    await rm(tempEmptyCwd, { recursive: true, force: true }).catch(() => {});
  }

  const failed = results.filter((result) => !result.ok);
  const summary = {
    ok: failed.length === 0,
    total: results.length,
    passed: results.length - failed.length,
    failed: failed.length,
    results
  };
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

  if (stderrChunks.length > 0 && failed.length > 0) {
    process.stderr.write(stderrChunks.join(''));
  }

  if (failed.length > 0) {
    process.exitCode = 1;
  }
};

void main();
