/**
 * Seed and migrate commands from the project's manifests, as config `scripts`.
 *
 * `stacktape dev` runs a configured `local-script` against the local databases (the MCP `seed` action runs the one
 * called `seed`). Each script gets the variables its own source reads, wired like a service's, and `connectTo` for what
 * they address. The type is always `local-script`: dev mode refuses any other kind because it reaches deployed
 * resources, and a seed is a development command, not a deploy hook.
 */

import type { DependencyFact } from '../facts/dependency';
import type { LocalScriptFact } from '../facts/project-facts';
import type { ServiceFact } from '../facts/service';
import { generatedDatabasePasswordSecretReference, wiringFor } from './env-wiring';

const DATABASE_KINDS: ReadonlySet<DependencyFact['kind']> = new Set(['postgres', 'mysql', 'mssql', 'mongodb']);

type ComposedLocalScript = { type: 'local-script'; properties: Record<string, unknown> };

const toUpperSnake = (name: string): string =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .toUpperCase();

export const composeLocalScripts = ({
  localScripts,
  services,
  composedDependencies,
  projectName,
  takenNames
}: {
  localScripts: readonly LocalScriptFact[];
  services: readonly ServiceFact[];
  composedDependencies: ReadonlyMap<string, { kind: DependencyFact['kind']; resourceName: string }>;
  projectName: string | undefined;
  /** Script names another part of the config already uses. */
  takenNames: ReadonlySet<string>;
}): Record<string, ComposedLocalScript> => {
  const scripts: Record<string, ComposedLocalScript> = {};
  for (const script of localScripts) {
    if (takenNames.has(script.name) || scripts[script.name] !== undefined) continue;
    const connectTo = new Set<string>();
    const environment: Array<{ name: string; value: string }> = [];
    const wire = (variableName: string, dependencyName: string): void => {
      const composed = composedDependencies.get(dependencyName);
      if (composed === undefined || environment.some((entry) => entry.name === variableName)) return;
      connectTo.add(composed.resourceName);
      const wiring = wiringFor(composed.kind, variableName);
      if (wiring.kind === 'param') {
        environment.push({
          name: variableName,
          value: `$ResourceParam('${composed.resourceName}', '${wiring.param}')`
        });
      } else if (wiring.kind === 'password-secret') {
        environment.push({
          name: variableName,
          value: generatedDatabasePasswordSecretReference(projectName, composed.resourceName)
        });
      }
    };

    for (const variable of script.environmentVariables) {
      if (variable.role === 'infra-dependency' && variable.dependencyName !== undefined) {
        wire(variable.name, variable.dependencyName);
        continue;
      }
      // `STP_DB_CONNECTION_STRING` is what `connectTo: [db]` injects, so the connection is the whole wiring.
      if (variable.name.startsWith('STP_')) {
        for (const [, composed] of composedDependencies) {
          if (variable.name.startsWith(`STP_${toUpperSnake(composed.resourceName)}_`))
            connectTo.add(composed.resourceName);
        }
      }
    }

    // The command runs a tool whose source is not in the repository (`prisma db seed`): it reaches the databases with
    // the variables the application itself uses for them.
    if (script.environmentVariables.length === 0) {
      for (const service of services) {
        for (const variable of service.environmentVariables) {
          if (variable.role !== 'infra-dependency' || variable.dependencyName === undefined) continue;
          const composed = composedDependencies.get(variable.dependencyName);
          if (composed !== undefined && DATABASE_KINDS.has(composed.kind)) wire(variable.name, variable.dependencyName);
        }
      }
    }

    scripts[script.name] = {
      type: 'local-script',
      properties: {
        executeCommand: script.command,
        ...(script.directory === '.' ? {} : { cwd: script.directory }),
        ...(connectTo.size === 0 ? {} : { connectTo: [...connectTo] }),
        ...(environment.length === 0 ? {} : { environment })
      }
    };
  }
  return scripts;
};
