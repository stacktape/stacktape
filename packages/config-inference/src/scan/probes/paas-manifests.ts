/**
 * The manifests other platforms already made the user write.
 *
 * A `render.yaml`, `fly.toml`, or Heroku `app.json` is strong evidence of the shape the user intended
 * to deploy. It does not prove that an app is running today. Reading the declaration still gives us
 * better commands, processes, databases, variable wiring, and ports than ecosystem conventions do.
 *
 * Two rules keep it honest:
 *
 * - **Potential data stays protected.** A declared database might already hold the user's data, so
 *   it carries deployment-manifest evidence and flows through the cautious
 *   never-replace-silently machinery without claiming that it is live.
 * - **Names travel, values do not.** Even though manifest values are committed plaintext, the
 *   facts document carries variable names and roles only — the composer decides what supplies
 *   each one, same as every other source.
 */

import { posix } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import yaml from 'yaml';
import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { Citation } from '../../facts/citation';
import type { EnvironmentVariableUse, ServiceFactInput } from '../../facts/service';
import { languageOf } from '../language';
import { isPlatformEnvironmentVariable } from '../platform-environment';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

type RecordValue = Record<string, unknown>;
const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** A manifest name reduced to something that can be a service fact name. */
const factName = (value: string): string => {
  const safe = value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  return safe.length === 0 ? 'app' : safe;
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const renderPath = (value: string): string => {
  const normalized = posix.normalize(value).replace(/^\.\//, '');
  return normalized === '' ? '.' : normalized;
};

const renderServicePaths = (service: RecordValue): { path: string; buildRoot?: string } => {
  const rootDirectory = asString(service.rootDir);
  if (rootDirectory !== undefined) return { path: renderPath(rootDirectory) };

  const declaredBuildRoot = renderPath(asString(service.dockerContext) ?? '.');
  const dockerfile = asString(service.dockerfilePath);
  const staticOutput = asString(service.staticPublishPath);
  const ownedDirectory =
    dockerfile === undefined
      ? staticOutput === undefined
        ? declaredBuildRoot
        : renderPath(posix.dirname(renderPath(staticOutput)))
      : renderPath(posix.dirname(renderPath(dockerfile)));
  return {
    path: ownedDirectory,
    ...(declaredBuildRoot === ownedDirectory ? {} : { buildRoot: declaredBuildRoot })
  };
};

/** Render's `env`/`runtime` values, in our language vocabulary. */
const RENDER_RUNTIMES: Readonly<Record<string, string>> = {
  node: 'javascript',
  python: 'python',
  ruby: 'ruby',
  go: 'go',
  rust: 'rust',
  elixir: 'elixir',
  docker: 'container',
  image: 'container'
};

const SECRETISH_NAME = /SECRET|TOKEN|PASSWORD|PASSWD|PRIVATE_KEY|API_KEY|APIKEY|ACCESS_KEY|CREDENTIAL|_KEY$/;

/** Heroku add-on slugs that name a backing service. */
const HEROKU_ADDONS: ReadonlyArray<{ prefix: string; kind: DependencyKind }> = [
  { prefix: 'heroku-postgresql', kind: 'postgres' },
  { prefix: 'heroku-redis', kind: 'redis' },
  { prefix: 'cleardb', kind: 'mysql' },
  { prefix: 'jawsdb', kind: 'mysql' },
  { prefix: 'mongolab', kind: 'mongodb' },
  { prefix: 'mongodb-atlas', kind: 'mongodb' },
  { prefix: 'cloudamqp', kind: 'amqp' },
  { prefix: 'bonsai', kind: 'search' },
  { prefix: 'searchbox', kind: 'search' }
];

type RenderEnvVar = {
  key?: unknown;
  value?: unknown;
  sync?: unknown;
  generateValue?: unknown;
  fromDatabase?: unknown;
  fromService?: unknown;
  fromGroup?: unknown;
};

const renderDeclarations = (
  parsed: RecordValue
): { services: RecordValue[]; databases: RecordValue[]; variableGroups: ReadonlyMap<string, RecordValue[]> } => {
  const services = Array.isArray(parsed.services) ? parsed.services.filter(isRecord) : [];
  const databases = Array.isArray(parsed.databases) ? parsed.databases.filter(isRecord) : [];

  // Render's current Blueprint shape nests deployable resources below
  // projects[].environments[]. A project can describe several environments with the same service
  // names; import the explicitly named production environment when present, otherwise the first
  // one, rather than deploying every preview/staging copy into one Stacktape stack.
  for (const project of Array.isArray(parsed.projects) ? parsed.projects.filter(isRecord) : []) {
    const environments = Array.isArray(project.environments) ? project.environments.filter(isRecord) : [];
    const environment =
      environments.find((entry) => asString(entry.name)?.toLowerCase() === 'production') ?? environments[0];
    if (environment === undefined) continue;
    if (Array.isArray(environment.services)) services.push(...environment.services.filter(isRecord));
    if (Array.isArray(environment.databases)) databases.push(...environment.databases.filter(isRecord));
  }

  const variableGroups = new Map<string, RecordValue[]>();
  for (const group of Array.isArray(parsed.envVarGroups) ? parsed.envVarGroups.filter(isRecord) : []) {
    const name = asString(group.name);
    if (name === undefined || !Array.isArray(group.envVars)) continue;
    variableGroups.set(name, group.envVars.filter(isRecord));
  }
  return { services, databases, variableGroups };
};

const renderVariable = (
  entry: RenderEnvVar,
  databaseNames: ReadonlyMap<string, string>,
  serviceNames: ReadonlyMap<string, string>,
  evidence: Citation[]
): EnvironmentVariableUse | undefined => {
  const key = asString(entry.key);
  if (key === undefined || isPlatformEnvironmentVariable(key)) return undefined;
  const base = { name: key, required: true, hasDeclaredValue: entry.value !== undefined, evidence };

  if (isRecord(entry.fromDatabase)) {
    const database = asString(entry.fromDatabase.name);
    const mapped = database === undefined ? undefined : databaseNames.get(database);
    if (mapped !== undefined) return { ...base, role: 'infra-dependency', dependencyName: mapped };
  }
  if (isRecord(entry.fromService)) {
    const target = asString(entry.fromService.name);
    const mapped = target === undefined ? undefined : serviceNames.get(target);
    const property = asString(entry.fromService.property)?.toLowerCase();
    const targetServiceProperty =
      property === 'url' || property === 'host' || property === 'port' || property === 'hostport'
        ? property
        : undefined;
    if (mapped !== undefined) {
      return {
        ...base,
        role: 'cross-service-reference',
        targetServiceName: mapped,
        ...(targetServiceProperty === undefined ? {} : { targetServiceProperty })
      };
    }
  }
  // A generated value or an unsynced one is a secret the platform holds today; the user will hold
  // it here. A plain value is ordinary configuration — the name travels, the value never does.
  if (entry.generateValue === true || entry.sync === false || SECRETISH_NAME.test(key)) {
    return { ...base, role: 'third-party-secret' };
  }
  return { ...base, role: 'runtime-config' };
};

const readRenderManifest = (
  file: string,
  raw: string
): { services: ServiceFactInput[]; dependencies: DependencyFact[] } | undefined => {
  let parsed: unknown;
  try {
    parsed = yaml.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;
  const { services: declaredServices, databases: declaredDatabases, variableGroups } = renderDeclarations(parsed);
  if (declaredServices.length === 0 && declaredDatabases.length === 0) return undefined;

  const dependencies: DependencyFact[] = [];
  /** Render database name → the dependency fact name we gave it. */
  const databaseNames = new Map<string, string>();
  for (const database of declaredDatabases) {
    const renderName = asString(database.name) ?? 'database';
    const name = declaredDatabases.length === 1 ? defaultDependencyName('postgres') : factName(renderName);
    databaseNames.set(renderName, name);
    const citation = citeFirstMatchOnly(file, raw, new RegExp(`name:\\s*["']?${escapeRegExp(renderName)}`));
    dependencies.push({
      name,
      kind: 'postgres',
      extensions: [],
      consumedBy: [],
      addressedBy: [],
      ...(asString(database.postgresMajorVersion) === undefined
        ? {}
        : { engineVersion: asString(database.postgresMajorVersion) }),
      hostingEvidence: 'deployment-manifest',
      evidence: citation === undefined ? [] : [citation],
      source: 'probe'
    });
  }

  /** Render service name → our fact name, for cross-service references. */
  const serviceNames = new Map<string, string>();
  const deployable = declaredServices.filter((service) => {
    const type = asString(service.type);
    return type === 'web' || type === 'worker' || type === 'pserv' || type === 'cron';
  });
  for (const service of deployable) {
    const renderName = asString(service.name) ?? 'app';
    serviceNames.set(renderName, factName(renderName));
  }

  // Key-value/Redis instances are declared as services on Render, but they are backing stores.
  for (const service of declaredServices) {
    const type = asString(service.type);
    if (type !== 'redis' && type !== 'keyvalue') continue;
    const renderName = asString(service.name) ?? 'cache';
    const citation = citeFirstMatchOnly(file, raw, new RegExp(`name:\\s*["']?${escapeRegExp(renderName)}`));
    dependencies.push({
      name: defaultDependencyName('redis'),
      kind: 'redis',
      extensions: [],
      consumedBy: [],
      addressedBy: [],
      hostingEvidence: 'deployment-manifest',
      evidence: citation === undefined ? [] : [citation],
      source: 'probe'
    });
  }

  const byPath = new Map<string, number>();
  for (const service of deployable) {
    const { path } = renderServicePaths(service);
    byPath.set(path, (byPath.get(path) ?? 0) + 1);
  }

  const services: ServiceFactInput[] = [];
  for (const service of deployable) {
    const renderName = asString(service.name) ?? 'app';
    const type = asString(service.type);
    const runtime = asString(service.runtime) ?? asString(service.env);
    const { path, buildRoot } = renderServicePaths(service);
    const citation = citeFirstMatchOnly(file, raw, new RegExp(`name:\\s*["']?${escapeRegExp(renderName)}`));
    const evidence = citation === undefined ? [] : [citation];

    const declaredVariables = (Array.isArray(service.envVars) ? service.envVars.filter(isRecord) : []).flatMap(
      (entry) => {
        const group = asString(entry.fromGroup);
        return group === undefined ? [entry] : (variableGroups.get(group) ?? []);
      }
    );
    const environmentVariables = declaredVariables
      .map((entry) => renderVariable(entry as RenderEnvVar, databaseNames, serviceNames, evidence))
      .filter((entry): entry is EnvironmentVariableUse => entry !== undefined);

    // A variable that addresses a database is also consumption evidence for it.
    for (const variable of environmentVariables) {
      if (variable.role !== 'infra-dependency' || variable.dependencyName === undefined) continue;
      const dependency = dependencies.find((entry) => entry.name === variable.dependencyName);
      if (dependency === undefined) continue;
      if (!dependency.addressedBy.includes(variable.name)) dependency.addressedBy.push(variable.name);
      if (!dependency.consumedBy.includes(factName(renderName))) dependency.consumedBy.push(factName(renderName));
    }

    const isStatic = runtime === 'static';
    const staticPath = asString(service.staticPublishPath);
    const dockerfile = asString(service.dockerfilePath);

    services.push({
      name: factName(renderName),
      path,
      ...(buildRoot === undefined ? {} : { buildRoot }),
      // Several Render services can share one directory — a web and a worker over one codebase —
      // and only the process name keeps them from folding into each other.
      ...((byPath.get(path) ?? 0) > 1 ? { processType: `render:${factName(renderName)}` } : {}),
      language: (runtime === undefined ? undefined : RENDER_RUNTIMES[runtime]) ?? 'unknown',
      exposesHttp: type === 'web' && !isStatic,
      executionModel: type === 'cron' ? 'scheduled' : 'long-running',
      ...(type === 'cron' && asString(service.schedule) !== undefined ? { schedule: asString(service.schedule) } : {}),
      ...(isStatic ? { servesStaticAssets: { path: staticPath === undefined ? path : renderPath(staticPath) } } : {}),
      ...(asString(service.buildCommand) === undefined ? {} : { buildCommand: asString(service.buildCommand) }),
      // The command Render runs in production today — the exact thing every other probe can only
      // approximate.
      ...(asString(service.startCommand) === undefined && asString(service.dockerCommand) === undefined
        ? {}
        : { startCommand: asString(service.startCommand) ?? asString(service.dockerCommand) }),
      ...(dockerfile === undefined ? {} : { dockerfile: renderPath(dockerfile) }),
      ...(asString(service.healthCheckPath) === undefined
        ? {}
        : { healthCheckPath: asString(service.healthCheckPath) }),
      environmentVariables,
      evidence,
      source: 'probe'
    });
  }

  return { services, dependencies };
};

const asPositivePort = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= 65_535 ? value : undefined;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string' && entry !== '') : [];

const manifestDirectoryOf = (file: string): string => {
  const directory = posix.dirname(file);
  return directory === '' ? '.' : directory;
};

const resolveManifestPath = (directory: string, value: string): string | undefined => {
  const resolved = posix.normalize(directory === '.' ? value : posix.join(directory, value)).replace(/^\.\//, '');
  return resolved === '..' || resolved.startsWith('../') ? undefined : resolved;
};

/**
 * Fly is TOML, including arrays of tables, quoted keys, comments, and values spanning lines.
 *
 * The old section regex handled the example in our test and little else: a `dockerfile` under an
 * unrelated section became the build file, lower-case environment keys vanished, and a second
 * `[[services]]` table ended the wrong block. A real TOML parser is both smaller and more honest.
 */
const readFlyManifest = (
  file: string,
  raw: string,
  files: readonly string[]
): { services: ServiceFactInput[] } | undefined => {
  let parsed: unknown;
  try {
    parsed = parseToml(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;

  const directory = manifestDirectoryOf(file);
  const appName = asString(parsed.app);
  const build = isRecord(parsed.build) ? parsed.build : {};
  const declaredDockerfile = asString(build.dockerfile);
  const resolvedDockerfile =
    declaredDockerfile === undefined ? undefined : resolveManifestPath(directory, declaredDockerfile);
  // A declaration pointing at a missing file is a broken Fly config, not permission to fabricate a
  // packaging path that will fail later. Other probes can still establish how the service runs.
  const dockerfile =
    resolvedDockerfile !== undefined && files.includes(resolvedDockerfile) ? resolvedDockerfile : undefined;

  const processesRecord = isRecord(parsed.processes) ? parsed.processes : {};
  const processes = Object.entries(processesRecord)
    .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== '')
    .map(([key, command]) => ({ key, command }));

  const httpService = isRecord(parsed.http_service) ? parsed.http_service : undefined;
  const legacyServices = Array.isArray(parsed.services) ? parsed.services.filter(isRecord) : [];
  const internalPort =
    asPositivePort(httpService?.internal_port) ??
    legacyServices.map((service) => asPositivePort(service.internal_port)).find((port) => port !== undefined);
  const httpProcessNames = new Set([
    ...asStringArray(httpService?.processes),
    ...legacyServices.flatMap((service) => asStringArray(service.processes))
  ]);
  const hasHttpService = httpService !== undefined || legacyServices.length > 0;
  if (appName === undefined && internalPort === undefined && processes.length === 0) return undefined;

  const environmentVariables: EnvironmentVariableUse[] = [];
  const env = isRecord(parsed.env) ? parsed.env : {};
  for (const name of Object.keys(env)) {
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !isPlatformEnvironmentVariable(name)) {
      const declaredPort =
        typeof env[name] === 'number'
          ? env[name]
          : typeof env[name] === 'string'
            ? Number.parseInt(env[name], 10)
            : undefined;
      // PORT is already represented by the service listener. Turning Fly's ordinary platform
      // setting into a Stacktape secret creates a pointless pre-deploy chore and can override the
      // port the load balancer expects.
      if (name === 'PORT' && internalPort !== undefined && declaredPort === internalPort) continue;
      const citation = citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(name)}\\s*=`));
      environmentVariables.push({
        name,
        // `[env]` on Fly is non-secret by the platform's own contract; secrets live elsewhere.
        role: 'runtime-config',
        hasDeclaredValue: true,
        required: true,
        evidence: citation === undefined ? [] : [{ ...citation, quote: `${name} =` }]
      });
    }
  }

  const name = factName(appName ?? 'app');
  const citation =
    citeFirstMatchOnly(file, raw, /^app\s*=\s*["'][^"']+["']/) ??
    citeFirstMatchOnly(file, raw, /internal_port\s*=\s*\d+/);
  const base = {
    path: directory,
    language: dockerfile !== undefined ? 'container' : (languageOf(files, directory) ?? 'unknown'),
    ...(dockerfile === undefined ? {} : { dockerfile }),
    environmentVariables,
    evidence: citation === undefined ? [] : [citation],
    source: 'probe' as const
  };

  if (processes.length === 0) {
    return {
      services: [
        {
          ...base,
          name,
          exposesHttp: hasHttpService || internalPort !== undefined,
          ...(internalPort === undefined ? {} : { port: internalPort }),
          executionModel: 'long-running'
        }
      ]
    };
  }

  const explicitHttpGroups = httpProcessNames.size > 0;
  const services: ServiceFactInput[] = [];
  for (const process of processes) {
    const isWeb = explicitHttpGroups
      ? httpProcessNames.has(process.key)
      : process.key === 'app' || process.key === 'web' || processes.length === 1;
    services.push({
      ...base,
      name: isWeb ? name : factName(`${name}-${process.key}`),
      // Every process gets an identity when several share the directory. The assembler folds a
      // generic package-manifest service into the HTTP process rather than producing a third copy.
      ...(processes.length > 1 ? { processType: `fly:${process.key}` } : {}),
      exposesHttp: isWeb && (hasHttpService || internalPort !== undefined),
      ...(isWeb && internalPort !== undefined ? { port: internalPort } : {}),
      executionModel: 'long-running' as const,
      startCommand: process.command
    });
  }
  return { services };
};

/** Heroku's `app.json`: add-ons name backing services and `env` names config shared by every dyno. */
const readHerokuAppManifest = (
  file: string,
  raw: string
): { dependencies: DependencyFact[]; environmentVariables: EnvironmentVariableUse[] } | undefined => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!isRecord(parsed)) return undefined;

  const dependencies: DependencyFact[] = [];
  for (const addon of Array.isArray(parsed.addons) ? parsed.addons : []) {
    const plan = typeof addon === 'string' ? addon : isRecord(addon) ? asString(addon.plan) : undefined;
    if (plan === undefined) continue;
    const slug = plan.split(':')[0] ?? plan;
    const kind = HEROKU_ADDONS.find((entry) => slug.startsWith(entry.prefix))?.kind;
    if (kind === undefined) continue;
    const citation = citeFirstMatchOnly(file, raw, new RegExp(escapeRegExp(slug)));
    dependencies.push({
      name: defaultDependencyName(kind),
      kind,
      extensions: [],
      consumedBy: [],
      addressedBy: [],
      hostingEvidence: 'deployment-manifest',
      evidence: citation === undefined ? [] : [citation],
      source: 'probe'
    });
  }
  const environmentVariables: EnvironmentVariableUse[] = [];
  if (isRecord(parsed.env)) {
    for (const name of Object.keys(parsed.env)) {
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name) || isPlatformEnvironmentVariable(name)) continue;
      const citation = citeFirstMatchOnly(file, raw, new RegExp(`["']${escapeRegExp(name)}["']\\s*:`));
      environmentVariables.push({
        name,
        role: SECRETISH_NAME.test(name) ? 'third-party-secret' : 'runtime-config',
        hasDeclaredValue: isRecord(parsed.env[name]) && parsed.env[name].value !== undefined,
        required: true,
        evidence: citation === undefined ? [] : [{ ...citation, quote: `"${name}":` }]
      });
    }
  }
  return dependencies.length === 0 && environmentVariables.length === 0
    ? undefined
    : { dependencies, environmentVariables };
};

export const paasManifestsProbe: Probe = {
  name: 'paas-manifests',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    const serviceEnvironments: NonNullable<ProbeOutput['serviceEnvironments']> = [];

    if (context.files.includes('render.yaml') || context.files.includes('render.yml')) {
      const file = context.files.includes('render.yaml') ? 'render.yaml' : 'render.yml';
      const raw = await readText(context, file);
      if (raw !== undefined) {
        const manifest = readRenderManifest(file, raw);
        if (manifest !== undefined) {
          services.push(...manifest.services);
          dependencies.push(...manifest.dependencies);
        }
      }
    }

    for (const file of context.files.filter((candidate) => /(^|\/)fly\.toml$/.test(candidate))) {
      // oxlint-disable-next-line no-await-in-loop -- each Fly app has its own manifest and identity.
      const raw = await readText(context, file);
      if (raw !== undefined) {
        const manifest = readFlyManifest(file, raw, context.files);
        if (manifest !== undefined) services.push(...manifest.services);
      }
    }

    if (context.files.includes('app.json')) {
      const raw = await readText(context, 'app.json');
      if (raw !== undefined) {
        const manifest = readHerokuAppManifest('app.json', raw);
        if (manifest !== undefined) {
          dependencies.push(...manifest.dependencies);
          if (manifest.environmentVariables.length > 0) {
            serviceEnvironments.push({ path: '.', environmentVariables: manifest.environmentVariables });
          }
        }
      }
    }

    if (services.length === 0 && dependencies.length === 0 && serviceEnvironments.length === 0) return {};
    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies }),
      ...(serviceEnvironments.length === 0 ? {} : { serviceEnvironments })
    };
  }
};
