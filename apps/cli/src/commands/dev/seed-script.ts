import { configManager } from '@domain-services/config-manager';
import { getExecutableScriptFunction } from '../script-run/utils';
import { agentLog } from './agent-logger';
import { getRunningLocalInstances } from './local-resources';
import { getResourceParamReferences } from './resource-references';

const MAX_OUTPUT_LINES = 200;

export type SeedScriptResult =
  | { ok: true; script: string; durationMs: number; output: string[]; omittedOutputLines?: number }
  | { ok: false; code: string; error: string; hint?: string; available?: string[]; output?: string[] };

/**
 * Why a configured script may not run as a seed: it must be a `local-script` whose `connectTo` and `$ResourceParam`
 * references name only databases this session runs locally, without a deployed workload's role. Anything else could
 * write to a deployed database.
 */
export const getSeedScriptRefusal = ({
  script,
  localResourceNames
}: {
  script: { type: string; properties?: { connectTo?: string[]; environment?: unknown; assumeRoleOfResource?: string } };
  localResourceNames: string[];
}): string | undefined => {
  if (script.type !== 'local-script') {
    return `it is a ${script.type}, which reaches deployed resources. Only a local-script runs against local databases.`;
  }
  if (script.properties?.assumeRoleOfResource) {
    return `it assumes the role of ${script.properties.assumeRoleOfResource}, which gives it access to deployed resources.`;
  }
  const local = new Set(localResourceNames);
  const referenced = [
    ...(script.properties?.connectTo ?? []),
    ...getResourceParamReferences({ environment: script.properties?.environment })
  ];
  const notLocal = [...new Set(referenced.filter((name) => !local.has(name)))];
  if (notLocal.length) {
    return `it connects to ${notLocal.join(', ')}, which this dev session does not run locally.`;
  }
  return undefined;
};

/**
 * Runs a script from the config's `scripts` section with this session's local database connections, the way a
 * `beforeDev` hook runs, and returns its output.
 */
export const runSeedScript = async (scriptName: string): Promise<SeedScriptResult> => {
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

  const refusal = getSeedScriptRefusal({
    script,
    localResourceNames: getRunningLocalInstances().map(({ name }) => name)
  });
  if (refusal) {
    return {
      ok: false,
      code: 'NOT_LOCAL',
      error: `Script "${scriptName}" cannot seed local databases: ${refusal}`
    };
  }

  const output: string[] = [];
  let omittedOutputLines = 0;
  const startedAt = Date.now();
  agentLog('dev', `Seed script started: ${scriptName}`);
  try {
    await getExecutableScriptFunction({
      scriptDefinition: { ...script, scriptName },
      onOutputLine: (line) => {
        output.push(line);
        if (output.length > MAX_OUTPUT_LINES) {
          output.shift();
          omittedOutputLines++;
        }
      }
    })({});
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    agentLog('dev', `Seed script failed: ${scriptName}`, 'error');
    return { ok: false, code: 'SCRIPT_FAILED', error: message, output };
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
