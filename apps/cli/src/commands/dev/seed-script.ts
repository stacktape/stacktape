import { configManager } from '@domain-services/config-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { getExecutableScriptFunction } from '../script-run/utils';
import { agentLog } from './agent-logger';
import { getRunningLocalInstances } from './local-resources';

const MAX_OUTPUT_LINES = 200;
/** Below the 60-second per-call timeout common in MCP clients, like the other waits of the MCP dev tool. */
export const DEFAULT_SEED_TIMEOUT_SECONDS = 50;
/** Below the 300-second response timeout of the HTTP client that calls the agent. */
export const MAX_SEED_TIMEOUT_SECONDS = 280;

export type SeedScriptResult =
  | { ok: true; script: string; durationMs: number; output: string[]; omittedOutputLines?: number }
  | { ok: false; code: string; error: string; hint?: string; available?: string[]; output?: string[] };

/**
 * Directives that read a resource or deployed CloudFormation state. Only `$ResourceParam` of a database running
 * locally resolves to something on this machine; the others name deployed resources, and a name that is itself a
 * directive cannot be checked.
 */
const RESOURCE_DIRECTIVE =
  /\$(ResourceParam|CfResourceParam|StackOutput|CfStackOutput|CfFormat|CfOutput)\(\s*(?:(['"])([^'"]*)\2)?/g;

const collectStrings = (value: unknown, strings: string[] = []): string[] => {
  if (typeof value === 'string') strings.push(value);
  else if (Array.isArray(value)) for (const item of value) collectStrings(item, strings);
  else if (value && typeof value === 'object') for (const item of Object.values(value)) collectStrings(item, strings);
  return strings;
};

/**
 * The resource references in a script that do not resolve to a database running locally, found in every string of its
 * properties: environment values, commands, script paths, and directives nested in `$Format` or elsewhere.
 */
export const findNonLocalReferences = (properties: unknown, localResourceNames: string[]): string[] => {
  const local = new Set(localResourceNames);
  const found = new Set<string>();
  for (const text of collectStrings(properties)) {
    for (const [, directive, , name] of text.matchAll(RESOURCE_DIRECTIVE)) {
      const resource = name?.split('.')[0];
      if (directive === 'ResourceParam' && resource && local.has(resource)) continue;
      found.add(`$${directive}(${name === undefined ? '...' : `'${name}'`})`);
    }
  }
  return [...found];
};

/**
 * Why a configured script may not run as a seed, judged before its directives resolve: it must be a `local-script`
 * without a deployed workload's role, whose `connectTo` and resource references name only databases this session runs
 * locally.
 */
export const getSeedScriptRefusal = ({
  script,
  localResourceNames
}: {
  script: { type: string; properties?: { connectTo?: string[]; assumeRoleOfResource?: string } };
  localResourceNames: string[];
}): string | undefined => {
  if (script.type !== 'local-script') {
    return `it is a ${script.type}, which reaches deployed resources. Only a local-script runs against local databases.`;
  }
  if (script.properties?.assumeRoleOfResource) {
    return `it assumes the role of ${script.properties.assumeRoleOfResource}, which gives it access to deployed resources.`;
  }
  const local = new Set(localResourceNames);
  const notLocal = [
    ...new Set((script.properties?.connectTo ?? []).filter((name) => !local.has(name))),
    ...findNonLocalReferences(script.properties, localResourceNames)
  ];
  if (notLocal.length) {
    return `it references ${notLocal.join(', ')}, which this dev session does not run locally.`;
  }
  return undefined;
};

/** Referenceable parameters whose values identify a deployed database: its hosts and endpoints. */
const DATABASE_ADDRESS_PARAMS = new Set([
  'host',
  'hosts',
  'readerHost',
  'readReplicaHosts',
  'endpoint',
  'domainEndpoint',
  'restUrl'
]);
/** DynamoDB tables have no host; their name and ARNs identify them. */
const DYNAMODB_TABLE_PARAMS = new Set(['name', 'arn', 'streamArn']);

/** Hosts, endpoints and table identifiers of the stack's resources that do not run on this machine. */
export const getDeployedDatabaseIdentifiers = (
  resources: Record<string, { resourceType?: string; referencableParams?: Record<string, { value?: unknown }> }>,
  localResourceNames: string[]
): string[] => {
  const local = new Set(localResourceNames);
  const identifiers = new Set<string>();
  for (const [name, { resourceType, referencableParams }] of Object.entries(resources)) {
    if (local.has(name)) continue;
    const isTable = resourceType?.includes('dynamo') ?? false;
    for (const [param, { value }] of Object.entries(referencableParams ?? {})) {
      if (typeof value !== 'string') continue;
      if (!DATABASE_ADDRESS_PARAMS.has(param) && !(isTable && DYNAMODB_TABLE_PARAMS.has(param))) continue;
      for (const identifier of value.split(',').map((part) => part.trim())) {
        // Short values such as "localhost" or a port would match unrelated text.
        if (identifier.length >= 8 && !/^(localhost|127\.0\.0\.1)$/i.test(identifier)) identifiers.add(identifier);
      }
    }
  }
  return [...identifiers];
};

/** The first identifier of a deployed database found in the resolved environment values or commands. */
export const findDeployedIdentifier = (values: unknown[], identifiers: string[]): string | undefined => {
  const texts = collectStrings(values).map((text) => text.toLowerCase());
  return identifiers.find((identifier) => texts.some((text) => text.includes(identifier.toLowerCase())));
};

class SeedRefusal extends Error {}

/**
 * Runs a script from the config's `scripts` section with this session's local database connections, the way a
 * `beforeDev` hook runs, and returns its output. Known references to deployed resources are refused before and after
 * the script's directives resolve. The script still runs with the developer's credentials and is not a sandbox.
 */
export const runSeedScript = async (
  scriptName: string,
  { timeoutSeconds = DEFAULT_SEED_TIMEOUT_SECONDS }: { timeoutSeconds?: number } = {}
): Promise<SeedScriptResult> => {
  if (!Number.isFinite(timeoutSeconds) || timeoutSeconds <= 0 || timeoutSeconds > MAX_SEED_TIMEOUT_SECONDS) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      error: `timeoutSeconds must be a number above 0 and at most ${MAX_SEED_TIMEOUT_SECONDS}.`
    };
  }
  const scripts = configManager.scripts ?? {};
  const script = scripts[scriptName];
  if (!script) {
    return {
      ok: false,
      code: 'NOT_FOUND',
      error: `The config has no script "${scriptName}".`,
      available: Object.keys(scripts),
      hint: 'Add a local-script with connectTo naming the local databases to the scripts section of the config.'
    };
  }

  const localResourceNames = getRunningLocalInstances().map(({ name }) => name);
  const refusal = getSeedScriptRefusal({ script, localResourceNames });
  if (refusal) {
    return { ok: false, code: 'NOT_LOCAL', error: `Script "${scriptName}" cannot seed local databases: ${refusal}` };
  }

  const output: string[] = [];
  let omittedOutputLines = 0;
  const startedAt = Date.now();
  const timeoutMs = timeoutSeconds * 1000;
  agentLog('dev', `Seed script started: ${scriptName}`);
  try {
    await getExecutableScriptFunction({
      scriptDefinition: { ...script, scriptName },
      timeoutMs,
      checkResolved: ({ env, commands }) => {
        const identifier = findDeployedIdentifier(
          [Object.values(env), commands],
          getDeployedDatabaseIdentifiers(deployedStackOverviewManager.stackInfoMap?.resources ?? {}, localResourceNames)
        );
        if (identifier) {
          throw new SeedRefusal(
            `Script "${scriptName}" cannot seed local databases: its resolved environment or command contains ${identifier}, the address of a deployed resource.`
          );
        }
      },
      onOutputLine: (line) => {
        output.push(line);
        if (output.length > MAX_OUTPUT_LINES) {
          output.shift();
          omittedOutputLines++;
        }
      }
    })({});
  } catch (error) {
    if (error instanceof SeedRefusal) {
      agentLog('dev', `Seed script refused: ${scriptName}`, 'warn');
      return { ok: false, code: 'NOT_LOCAL', error: error.message };
    }
    const timedOut = Date.now() - startedAt >= timeoutMs;
    agentLog('dev', `Seed script ${timedOut ? 'timed out' : 'failed'}: ${scriptName}`, 'error');
    return timedOut
      ? {
          ok: false,
          code: 'SCRIPT_TIMEOUT',
          error: `Script "${scriptName}" was stopped after ${timeoutSeconds} s.`,
          hint: `Pass a longer timeoutSeconds (at most ${MAX_SEED_TIMEOUT_SECONDS}) if the seed needs more time; the MCP client's own per-call timeout still applies.`,
          output
        }
      : { ok: false, code: 'SCRIPT_FAILED', error: error instanceof Error ? error.message : String(error), output };
  }
  agentLog('dev', `Seed script finished: ${scriptName}`);
  return {
    ok: true,
    script: scriptName,
    durationMs: Date.now() - startedAt,
    output,
    ...(omittedOutputLines ? { omittedOutputLines } : {})
  };
};
