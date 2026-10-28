import type { StpResourceType } from '@domain-services/config-manager/resolved-types/resources';
import { configManager } from '@domain-services/config-manager';
import {
  isResourceTypeExcludedInDevMode,
  isResourceTypeLocallyEmulatable,
  shouldDeployResourceInDevMode
} from '@domain-services/config-manager/dev-mode';
import { configErrors } from '@domain-services/config-manager/errors';
import { getReferenceableParamNames, isReferenceableParam } from '@stacktape/config-authoring/resource-metadata';
import { CliError } from '@utils/errors';
import { getDevNetworkDemand } from './dev-network-session';
import { getRelayedLocalResourceParamNames } from './local-resources';

/** A resource of the configuration as authored: `resources.<name>`. */
type ConfiguredResource = { type: string; properties?: Record<string, unknown> } & Record<string, unknown>;

export type DevStackReference = {
  /** The resource whose configuration holds the reference. */
  referencer: string;
  /** Where the reference is, from the configuration root. */
  path: string;
  resourceName: string;
  param: string;
};

type DevStackReferenceInput = {
  resources: Record<string, ConfiguredResource>;
  remoteResourceNames: ReadonlySet<string>;
  /** Functions left out of the session: the dev stack keeps them without their triggers. */
  skippedFunctionNames: ReadonlySet<string>;
};

const RESOURCE_PARAM = /\$ResourceParam\(\s*(['"])([^'"]+)\1\s*,\s*(['"])([^'"]+)\3\s*\)/g;

/**
 * Resources dev synthesis leaves out although they are not emulated: uptime checks and synthetic tests (see
 * `resolveUptimeChecks` and `resolveSyntheticTests`). Alarms are left out of dev stacks too (`isAlarmFreeStack`).
 */
const LEFT_OUT_OF_DEV_STACKS = new Set(['uptime-check', 'synthetic-test']);

/** Container workloads that run locally; the dev stack deploys only their roles (see `resolveDevContainerWorkloadRoles`). */
const LOCAL_CONTAINER_TYPES = new Set(['web-service', 'private-service', 'worker-service', 'multi-container-workload']);

const collectReferences = (value: unknown, path: string, referencer: string, into: DevStackReference[]) => {
  if (typeof value === 'string') {
    for (const match of value.matchAll(RESOURCE_PARAM)) {
      into.push({ referencer, path, resourceName: match[2], param: match[4] });
    }
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectReferences(item, `${path}[${index}]`, referencer, into));
  } else if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) collectReferences(child, `${path}.${key}`, referencer, into);
  }
};

/**
 * The `$ResourceParam` references that end up in the dev stack, and separately those in DynamoDB stream triggers of
 * deployed functions. Nested resource names (`web.bucket`) are left to synthesis.
 */
const getDevStackReferences = ({ resources, remoteResourceNames, skippedFunctionNames }: DevStackReferenceInput) => {
  const references: DevStackReference[] = [];
  const streamReferences: DevStackReference[] = [];
  for (const [name, resource] of Object.entries(resources)) {
    const type = resource.type as StpResourceType;
    const base = `resources.${name}`;
    if (isResourceTypeExcludedInDevMode(type)) {
      if (LOCAL_CONTAINER_TYPES.has(type)) {
        const statements = resource.properties?.iamRoleStatements;
        collectReferences(statements, `${base}.properties.iamRoleStatements`, name, references);
      }
      continue;
    }
    if (LEFT_OUT_OF_DEV_STACKS.has(type) || !shouldDeployResourceInDevMode(type, remoteResourceNames.has(name))) {
      continue;
    }
    const { events, alarms: _alarms, ...properties } = resource.properties ?? {};
    collectReferences({ ...resource, type: undefined, properties }, base, name, references);
    if (type !== 'function' || !Array.isArray(events)) {
      if (type !== 'function') collectReferences(events, `${base}.properties.events`, name, references);
      continue;
    }
    // A skipped function's triggers are not in the dev stack, but its stream still keeps the table deployed: the
    // resource picker must not delete a deployed table and its data (see `findStreamTablesToDeploy`).
    const skipped = skippedFunctionNames.has(name);
    events.forEach((event: { type?: string; properties?: Record<string, unknown> }, index) => {
      const path = `${base}.properties.events[${index}]`;
      if (event?.type !== 'dynamo-db-stream') {
        if (!skipped) collectReferences(event, path, name, references);
        return;
      }
      const { streamArn, ...rest } = event.properties ?? {};
      collectReferences(streamArn, `${path}.properties.streamArn`, name, streamReferences);
      if (!skipped) collectReferences({ ...event, properties: rest }, path, name, references);
    });
  }
  return {
    references: references.filter(({ resourceName }) => !resourceName.includes('.')),
    streamReferences: streamReferences.filter(({ resourceName }) => !resourceName.includes('.'))
  };
};

/**
 * Local DynamoDB tables whose streams functions read, with those functions. A stream trigger needs the deployed table's
 * stream, so `stacktape dev` deploys such a table in the dev stack. A function left out of the session counts too:
 * otherwise skipping it would delete the deployed table and its data.
 */
export const findStreamTablesToDeploy = (input: DevStackReferenceInput): Map<string, string[]> => {
  const tables = new Map<string, string[]>();
  for (const { resourceName, referencer } of getDevStackReferences(input).streamReferences) {
    const table = input.resources[resourceName];
    if (table?.type !== 'dynamo-db-table' || input.remoteResourceNames.has(resourceName)) continue;
    tables.set(resourceName, [...new Set([...(tables.get(resourceName) ?? []), referencer])]);
  }
  return tables;
};

/**
 * Fails, before `stacktape dev` does any AWS work, on a `$ResourceParam` that the dev stack could not resolve: a
 * resource or parameter that does not exist, or a resource the dev stack does not deploy. A local database resolves
 * only in deployed functions and batch jobs that reach it through the dev box (`relayedParamNames`), and only for the
 * parameters the relay gives.
 */
export const assertDevStackReferencesResolve = ({
  relayedParamNames,
  ...input
}: DevStackReferenceInput & {
  /** The parameters of each local resource that deployed functions reach through the dev box. */
  relayedParamNames: ReadonlyMap<string, readonly string[]>;
}) => {
  const { references, streamReferences } = getDevStackReferences(input);
  const notDeployed: (DevStackReference & { canBeRemote: boolean })[] = [];
  for (const reference of [...references, ...streamReferences]) {
    const { resourceName, param } = reference;
    const target = input.resources[resourceName];
    if (!target) throw configErrors.directiveResourceNotFound({ resourceName, directiveType: '$ResourceParam' });
    const referencableParams = getReferenceableParamNames(target.type);
    if (referencableParams.length && !isReferenceableParam(target.type, param)) {
      throw configErrors.directiveResourceParameterInvalid({
        resourceName,
        referencedParam: param,
        referencableParams,
        directiveType: '$ResourceParam'
      });
    }
    const type = target.type as StpResourceType;
    if (isResourceTypeExcludedInDevMode(type)) {
      notDeployed.push({ ...reference, canBeRemote: false });
    } else if (!shouldDeployResourceInDevMode(type, input.remoteResourceNames.has(resourceName))) {
      if (!relayedParamNames.get(resourceName)?.includes(param)) notDeployed.push({ ...reference, canBeRemote: true });
    }
  }
  if (notDeployed.length) throw localResourceReferencedError(notDeployed, input.resources);
};

const localResourceReferencedError = (
  references: (DevStackReference & { canBeRemote: boolean })[],
  resources: Record<string, ConfiguredResource>
) => {
  const lines = references.map(
    ({ path, resourceName, param }) => `  ${path}: $ResourceParam('${resourceName}', '${param}')`
  );
  const names = (canBeRemote: boolean) => [
    ...new Set(references.filter((reference) => reference.canBeRemote === canBeRemote).map((r) => r.resourceName))
  ];
  const remotable = names(true);
  const onMachine = names(false);
  const states = [
    ...remotable.map((name) =>
      isResourceTypeLocallyEmulatable(resources[name].type as StpResourceType)
        ? `\`${name}\` runs locally in dev mode`
        : `\`${name}\` is not deployed in dev mode`
    ),
    ...onMachine.map((name) => `\`${name}\` runs on your machine in dev mode`)
  ];
  const them = (list: unknown[]) => (list.length === 1 ? 'it' : 'them');
  return new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'DEV_LOCAL_RESOURCE_REFERENCED',
    message: `${states.join(', ')}, but the dev stack in AWS needs ${them(references)} here:\n${lines.join('\n')}`,
    hints: [
      ...(remotable.length
        ? [
            `To use the deployed ${remotable.join(', ')} in dev mode, add ${them(remotable)} to remoteResources ` +
              `(\`--remote-resources ${remotable.join(',')}\`, or \`args.remoteResources\` in MCP), or set \`dev.remote: true\` on ${remotable.length === 1 ? 'it' : 'each'}.`,
            'A local database gives the dev stack only its address and credentials, and only to deployed functions and batch jobs that reach it through the dev box (with the database in their environment or connectTo).'
          ]
        : []),
      ...(onMachine.length
        ? [
            `Containers and frontends always run on your machine in dev mode, so deployed resources cannot reference ${onMachine.join(', ')}.`
          ]
        : [])
    ]
  });
};

/**
 * Runs before the dev network and the dev stack, so a configuration the dev stack cannot use fails in seconds. Deploys
 * the local DynamoDB tables that stream triggers read, and returns a notice for each.
 */
export const prepareDevStackReferences = ({
  noTunnel,
  skippedFunctionNames
}: {
  noTunnel: boolean;
  skippedFunctionNames: ReadonlySet<string>;
}): string[] => {
  const resources = configManager.config.resources as Record<string, ConfiguredResource>;
  const streamTables = findStreamTablesToDeploy({
    resources,
    remoteResourceNames: configManager.deploymentContext.remoteResourceNames,
    skippedFunctionNames
  });
  configManager.setDevSkippedFunctions(skippedFunctionNames);
  configManager.setDevAutoRemoteResources([...streamTables.keys()]);
  const relayedParamNames = new Map<string, readonly string[]>();
  // Deployed functions and batch jobs reach local databases through the dev box.
  const { functions, batchJobs } = getDevNetworkDemand({ noTunnel });
  for (const name of new Set([...Object.values(functions), ...Object.values(batchJobs ?? {})].flat())) {
    const params = getRelayedLocalResourceParamNames(name);
    if (params) relayedParamNames.set(name, params);
  }
  assertDevStackReferencesResolve({
    resources,
    remoteResourceNames: configManager.deploymentContext.remoteResourceNames,
    skippedFunctionNames,
    relayedParamNames
  });
  return [...streamTables].map(
    ([table, functions]) =>
      `${table} is deployed in the dev stack because ${functions.join(', ')} ${functions.length === 1 ? 'reads' : 'read'} its stream; ` +
      'local containers and functions use the deployed table too.'
  );
};
