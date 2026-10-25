/**
 * Variables an application already reads in Stacktape's own `connectTo` naming.
 *
 * `connectTo` injects every parameter of a connected resource as `STP_<RESOURCE_NAME>_<PARAM>`, with the resource
 * name in upper snake case: resource `db` gives `STP_DB_CONNECTION_STRING`, `mainDatabase` gives
 * `STP_MAIN_DATABASE_HOST`. Code written for Stacktape therefore states the resource names it expects. A config that
 * names the database `mainDatabase` while the code reads `STP_DB_*` deploys a function that cannot find its database,
 * so these reads decide the dependency's name, and the functions that read them get `connectTo`.
 *
 * Runs in the assembler after every probe and the source scan have spoken, because it needs the final dependency
 * list and each service's own reads.
 */

import type { DependencyFact, DependencyKind } from '../facts/dependency';
import type { ServiceFactInput } from '../facts/service';

const RDS_KINDS: readonly DependencyKind[] = ['postgres', 'mysql', 'mssql'];
const CONNECTION_KINDS: readonly DependencyKind[] = [...RDS_KINDS, 'redis', 'mongodb'];
const NAMED_KINDS: readonly DependencyKind[] = ['queue', 'topic', 'object-storage', 'dynamodb'];

/**
 * Parameter suffixes `connectTo` publishes, longest first, with the dependency kinds that publish each.
 *
 * The parameter names are the ones the CLI's resource resolvers publish (see `compose/env-wiring.ts`), converted
 * the way `injectedParameterEnvVarName` converts them.
 */
const PARAMETERS: ReadonlyArray<{ suffix: string; kinds: readonly DependencyKind[] }> = [
  { suffix: 'READER_CONNECTION_STRING', kinds: [...RDS_KINDS, 'redis'] },
  { suffix: 'JDBC_CONNECTION_STRING', kinds: RDS_KINDS },
  { suffix: 'CONNECTION_STRING', kinds: CONNECTION_KINDS },
  { suffix: 'DOMAIN_ENDPOINT', kinds: ['search'] },
  { suffix: 'READER_HOST', kinds: [...RDS_KINDS, 'redis'] },
  { suffix: 'STREAM_ARN', kinds: ['dynamodb'] },
  { suffix: 'DB_NAME', kinds: RDS_KINDS },
  { suffix: 'HOST', kinds: [...RDS_KINDS, 'redis'] },
  { suffix: 'PORT', kinds: [...RDS_KINDS, 'redis'] },
  { suffix: 'URL', kinds: ['queue'] },
  { suffix: 'ARN', kinds: [...NAMED_KINDS, 'search'] },
  { suffix: 'NAME', kinds: NAMED_KINDS }
];

/** Words in a resource name that say which kind it is, for reads whose parameters fit several kinds. */
const NAME_HINTS: ReadonlyArray<{ pattern: RegExp; kinds: readonly DependencyKind[] }> = [
  { pattern: /(?:^|_)(?:DB|DATABASE|POSTGRES|PG|SQL|MYSQL|RDS|AURORA)(?:_|$)/, kinds: [...RDS_KINDS, 'mongodb'] },
  { pattern: /(?:^|_)(?:CACHE|REDIS|SESSIONS?|VALKEY)(?:_|$)/, kinds: ['redis'] },
  { pattern: /(?:^|_)MONGO(?:DB)?(?:_|$)/, kinds: ['mongodb'] },
  { pattern: /(?:^|_)(?:QUEUE|JOBS?|TASKS?|MESSAGES)(?:_|$)/, kinds: ['queue'] },
  { pattern: /(?:^|_)(?:TOPIC|NOTIFICATIONS?|EVENTS)(?:_|$)/, kinds: ['topic'] },
  { pattern: /(?:^|_)(?:BUCKET|UPLOADS?|FILES|ASSETS|STORAGE|MEDIA)(?:_|$)/, kinds: ['object-storage'] },
  { pattern: /(?:^|_)(?:TABLE|DYNAMO(?:DB)?)(?:_|$)/, kinds: ['dynamodb'] }
];

type Reference = { resource: string; parameter: string; kinds: readonly DependencyKind[] };

/** Split `STP_MAIN_DATABASE_HOST` into `MAIN_DATABASE` and `HOST`, when the suffix is a published parameter. */
export const parseStacktapeReference = (variableName: string): Reference | undefined => {
  if (!variableName.startsWith('STP_')) return undefined;
  const rest = variableName.slice('STP_'.length);
  for (const { suffix, kinds } of PARAMETERS) {
    if (!rest.endsWith(`_${suffix}`)) continue;
    const resource = rest.slice(0, -suffix.length - 1);
    if (!/^[A-Z][A-Z0-9_]*$/.test(resource)) return undefined;
    return { resource, parameter: suffix, kinds };
  }
  return undefined;
};

/** `MAIN_DATABASE` → `mainDatabase`, the resource name whose `connectTo` variables start with `STP_MAIN_DATABASE_`. */
export const resourceNameForReference = (resource: string): string =>
  resource.toLowerCase().replace(/_([a-z0-9])/g, (_, character: string) => character.toUpperCase());

/**
 * Name dependencies after the `STP_*` variables the code reads and record their readers as consumers.
 *
 * A group of reads for one resource name binds to a dependency only when exactly one dependency of a compatible kind
 * is left, either from the parameters alone or with the resource name's own hint (`DB`, `CACHE`, `JOBS`). Anything
 * else stays unbound: naming the wrong database after the code's variable would be worse than leaving a question.
 *
 * Mutates the assembler's freshly built services and dependencies, as the source scan does.
 */
export const applyStacktapeReferences = ({
  services,
  dependencies
}: {
  services: ServiceFactInput[];
  dependencies: DependencyFact[];
}): void => {
  const groups = new Map<string, { kinds: Set<DependencyKind> }>();
  for (const service of services) {
    for (const variable of service.environmentVariables ?? []) {
      const reference = parseStacktapeReference(variable.name);
      if (reference === undefined) continue;
      const group = groups.get(reference.resource);
      if (group === undefined) {
        groups.set(reference.resource, { kinds: new Set(reference.kinds) });
      } else {
        group.kinds = new Set([...group.kinds].filter((kind) => reference.kinds.includes(kind)));
      }
    }
  }
  if (groups.size === 0) return;

  const bound = new Map<string, DependencyFact>();
  const claimed = new Set<DependencyFact>();
  const candidatesFor = (resource: string, useHint: boolean): DependencyFact[] => {
    const { kinds } = groups.get(resource)!;
    const hinted = useHint
      ? NAME_HINTS.filter((hint) => hint.pattern.test(resource)).flatMap((hint) => hint.kinds)
      : undefined;
    return dependencies.filter(
      (dependency) =>
        !claimed.has(dependency) &&
        kinds.has(dependency.kind) &&
        (hinted === undefined || hinted.includes(dependency.kind))
    );
  };
  // A dependency already called what the code expects binds first; then unique fits, then fits by name hint, each
  // pass repeated until nothing changes, because one binding can make the next one unique.
  for (const [resource] of groups) {
    const exact = dependencies.find(
      (dependency) =>
        dependency.name === resourceNameForReference(resource) && groups.get(resource)!.kinds.has(dependency.kind)
    );
    if (exact !== undefined && !claimed.has(exact)) {
      bound.set(resource, exact);
      claimed.add(exact);
    }
  }
  for (const useHint of [false, true]) {
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const [resource] of groups) {
        if (bound.has(resource)) continue;
        const candidates = candidatesFor(resource, useHint);
        if (candidates.length !== 1) continue;
        bound.set(resource, candidates[0]!);
        claimed.add(candidates[0]!);
        progressed = true;
      }
    }
  }
  if (bound.size === 0) return;

  const takenNames = new Set(dependencies.map((dependency) => dependency.name));
  const renames = new Map<string, string>();
  for (const [resource, dependency] of bound) {
    const name = resourceNameForReference(resource);
    if (dependency.name === name) continue;
    // Another dependency already holds the name; renaming would merge two resources into one.
    if (takenNames.has(name)) {
      bound.delete(resource);
      continue;
    }
    takenNames.delete(dependency.name);
    takenNames.add(name);
    renames.set(dependency.name, name);
    dependency.name = name;
  }

  // The assembler built these objects for this run, so they are updated in place.
  for (const service of services) {
    for (const variable of service.environmentVariables ?? []) {
      const reference = parseStacktapeReference(variable.name);
      const dependency = reference === undefined ? undefined : bound.get(reference.resource);
      if (dependency !== undefined) {
        variable.role = 'infra-dependency';
        variable.dependencyName = dependency.name;
        variable.required = true;
        continue;
      }
      const renamed = variable.dependencyName === undefined ? undefined : renames.get(variable.dependencyName);
      if (renamed !== undefined) variable.dependencyName = renamed;
    }
    for (const trigger of service.functionTriggers ?? []) {
      if (!('dependencyName' in trigger)) continue;
      trigger.dependencyName = renames.get(trigger.dependencyName) ?? trigger.dependencyName;
    }
  }

  // The reads are exact: whoever reads `STP_DB_*`, directly or through a module it imports, uses `db`, and nobody
  // else needs its access because a colocated file mentions it.
  for (const dependency of new Set(bound.values())) {
    dependency.consumedBy = services
      .filter((service) =>
        (service.environmentVariables ?? []).some(
          (variable) => variable.role === 'infra-dependency' && variable.dependencyName === dependency.name
        )
      )
      .map((service) => service.name);
  }
};
