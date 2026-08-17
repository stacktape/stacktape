/**
 * High-level concepts from a Terraform declaration — never a 1:1 translation.
 *
 * The goal the product owner set: understand that this repository is, say, "a web API with a
 * Postgres database", and carry the concrete details worth carrying — the instance class, the
 * engine version — not to re-implement Terraform. Everything extracted here becomes ordinary
 * dependency facts. A declaration is not proof that `terraform apply` ever ran, but a stateful
 * declaration still takes the cautious route through the never-replace-silently machinery: the
 * default avoids creating a replacement, and a new copy is an explicit, visible choice.
 *
 * Deliberately partial, stated once:
 * - Literal attribute values plus literal `variable` defaults and `locals`. Other expressions and
 *   interpolations resolve to nothing rather than to a guess; modules are not expanded.
 * - Compute (ECS services, task definitions, EC2) is not translated — the application itself is
 *   what the rest of the scan reads, and Terraform's copy of it would only fight those probes.
 * - True adoption — importing Terraform-managed resources into Stacktape's stack — is the adopt
 *   mission. This importer only makes the scan *understand* what is there.
 */

import { defaultDependencyName, type DependencyFact, type DependencyKind } from '../../facts/dependency';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { sliceBalancedBraces } from '../balanced-slice';
import { citeFirstMatchOnly, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';

/** The same location rule the existing-deployment probe applies: root and the conventional homes. */
const TERRAFORM_FILE = /^(?:[^/]+|infra[^/]*\/[^/]+|terraform\/[^/]+|deploy\/[^/]+)\.tf$/;

const RESOURCE_KINDS: ReadonlyArray<{ types: readonly string[]; kind: DependencyKind }> = [
  { types: ['aws_db_instance', 'aws_rds_cluster'], kind: 'postgres' },
  {
    types: [
      'aws_elasticache_cluster',
      'aws_elasticache_replication_group',
      'aws_elasticache_serverless_cache',
      'aws_memorydb_cluster'
    ],
    kind: 'redis'
  },
  { types: ['aws_sqs_queue'], kind: 'queue' },
  { types: ['aws_sns_topic'], kind: 'topic' },
  { types: ['aws_s3_bucket'], kind: 'object-storage' },
  { types: ['aws_dynamodb_table'], kind: 'dynamodb' },
  { types: ['aws_opensearch_domain', 'aws_elasticsearch_domain'], kind: 'search' },
  { types: ['aws_mq_broker'], kind: 'amqp' },
  { types: ['aws_msk_cluster'], kind: 'kafka' }
];

/** Engines a `aws_db_instance.engine` attribute can name, in our vocabulary. */
const DB_ENGINES: Readonly<Record<string, DependencyKind>> = {
  postgres: 'postgres',
  'aurora-postgresql': 'postgres',
  mysql: 'mysql',
  'aurora-mysql': 'mysql',
  mariadb: 'mysql',
  sqlserver: 'mssql'
};

type TerraformBlock = {
  type: string;
  name: string;
  /** Flat literal attributes only: `key = "value"` and `key = 123`. */
  attributes: Record<string, string>;
  /** The original block body, used for bounded relationship reads such as Lambda environment. */
  body: string;
  headerLine: number;
};

/**
 * The subset of HCL this needs: top-level `resource "type" "name" { ... }` blocks with their flat
 * literal attributes. Nested blocks are skipped whole; brace counting keeps the walk honest.
 */
export const readTerraformBlocks = (
  contents: string,
  literals: Readonly<Record<string, string>> = {}
): TerraformBlock[] => {
  const blocks: TerraformBlock[] = [];
  const lines = contents.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const header = /^\s*resource\s+"([^"]+)"\s+"([^"]+)"\s*\{/.exec(lines[index] ?? '');
    if (header === null) continue;

    const attributes: Record<string, string> = {};
    let depth = 1;
    let cursor = index;
    let heredocEnd: string | undefined;
    while (depth > 0 && cursor < lines.length - 1) {
      cursor += 1;
      const line = lines[cursor] ?? '';
      if (heredocEnd !== undefined) {
        if (line.trim() === heredocEnd) heredocEnd = undefined;
        continue;
      }
      const heredoc = /^\s*[a-z0-9_]+\s*=\s*<<-?\s*([A-Za-z0-9_]+)\s*$/.exec(line);
      if (heredoc !== null) {
        heredocEnd = heredoc[1];
        continue;
      }
      const { opens, closes } = braceCounts(line);
      if (depth === 1) {
        const literal =
          /^\s*([a-z0-9_]+)\s*=\s*(?:"([^"]*)"|(\d+(?:\.\d+)?)|((?:var|local)\.[a-zA-Z0-9_]+))\s*(?:#.*)?$/.exec(line);
        if (literal !== null) {
          const value = literal[2] ?? literal[3] ?? (literal[4] === undefined ? undefined : literals[literal[4]]);
          if (value !== undefined) attributes[literal[1]!] = value;
        }
      }
      depth += opens - closes;
    }

    blocks.push({
      type: header[1]!,
      name: header[2]!,
      attributes,
      body: lines.slice(index + 1, cursor).join('\n'),
      headerLine: index + 1
    });
    index = cursor;
  }

  return blocks;
};

/** Braces that are HCL syntax, excluding quoted strings and line comments. */
const braceCounts = (line: string): { opens: number; closes: number } => {
  let opens = 0;
  let closes = 0;
  let quote: '"' | "'" | undefined;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;
    if (quote !== undefined) {
      if (character === '\\') index += 1;
      else if (character === quote) quote = undefined;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === '#' || (character === '/' && line[index + 1] === '/')) break;
    if (character === '{') opens += 1;
    if (character === '}') closes += 1;
  }
  return { opens, closes };
};

/** Literal defaults are safe to resolve; expressions remain absent. */
const terraformLiterals = (contents: string): Record<string, string> => {
  const lines = contents.split(/\r?\n/);
  const values: Record<string, string> = {};
  for (let index = 0; index < lines.length; index += 1) {
    const variable = /^\s*variable\s+"([^"]+)"\s*\{/.exec(lines[index] ?? '');
    const locals = /^\s*locals\s*\{/.test(lines[index] ?? '');
    if (variable === null && !locals) continue;
    let depth = 1;
    let cursor = index;
    while (depth > 0 && cursor < lines.length - 1) {
      cursor += 1;
      const line = lines[cursor] ?? '';
      if (depth === 1) {
        const literal = /^\s*([a-zA-Z0-9_]+)\s*=\s*(?:"([^"]*)"|(\d+(?:\.\d+)?))\s*(?:#.*)?$/.exec(line);
        if (literal !== null) {
          const value = literal[2] ?? literal[3] ?? '';
          if (variable !== null && literal[1] === 'default') values[`var.${variable[1]}`] = value;
          if (locals) values[`local.${literal[1]}`] = value;
        }
      }
      const counts = braceCounts(line);
      depth += counts.opens - counts.closes;
    }
    index = cursor;
  }
  return values;
};

const factName = (value: string): string => {
  const safe = value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, character: string) => character.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, '');
  return safe.length === 0 ? 'resource' : safe;
};

const databaseKindForEngine = (engine: string): DependencyKind | undefined => {
  const normalized = engine.toLowerCase();
  if (normalized.startsWith('sqlserver-')) return 'mssql';
  return DB_ENGINES[normalized];
};

const functionEntrypointFor = (
  handler: string,
  runtime: string | undefined,
  files: readonly string[]
): string | undefined => {
  const modulePath = handler.slice(0, handler.lastIndexOf('.')) || handler;
  const extension = runtime?.startsWith('python') ? 'py' : runtime?.startsWith('node') ? undefined : undefined;
  const extensions = extension === undefined ? ['ts', 'js', 'mjs', 'cjs', 'py'] : [extension];
  const candidates = files.filter((file) =>
    extensions.some(
      (candidateExtension) =>
        file === `${modulePath}.${candidateExtension}` || file.endsWith(`/${modulePath}.${candidateExtension}`)
    )
  );
  return candidates.length === 1 ? candidates[0] : undefined;
};

const languageForEntrypoint = (entrypoint: string): string =>
  entrypoint.endsWith('.py')
    ? 'python'
    : entrypoint.endsWith('.ts')
      ? 'typescript'
      : entrypoint.endsWith('.js') || entrypoint.endsWith('.mjs') || entrypoint.endsWith('.cjs')
        ? 'javascript'
        : 'unknown';

const terraformEnvironment = (
  body: string,
  dependencyReferences: ReadonlyMap<string, string>,
  evidence: ServiceFactInput['evidence']
): EnvironmentVariableUse[] => {
  const declaration = /\bvariables\s*=\s*\{/.exec(body);
  if (declaration === null || declaration.index === undefined) return [];
  const openingBrace = declaration.index + declaration[0].length - 1;
  const variablesBody = sliceBalancedBraces(body, openingBrace)?.body;
  if (variablesBody === undefined) return [];

  const variables: EnvironmentVariableUse[] = [];
  for (const match of variablesBody.matchAll(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*([^\r\n#]+?)(?:\s+#.*)?$/gm)) {
    const name = match[1]!;
    const expression = match[2]!.trim();
    const reference =
      /\b(aws_[a-z0-9_]+\.[A-Za-z0-9_-]+)(?:\.[A-Za-z0-9_-]+)?/.exec(expression)?.[1] ??
      /\b((?:var|local)\.[A-Za-z0-9_]+)\b/.exec(expression)?.[1];
    const dependencyName = reference === undefined ? undefined : dependencyReferences.get(reference);
    variables.push(declaredEnvironmentVariable({ name, dependencyName, evidence }));
  }
  return variables;
};

export const terraformProbe: Probe = {
  name: 'terraform',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const files = context.files.filter((file) => TERRAFORM_FILE.test(file));
    if (files.length === 0) return {};

    const sources = await Promise.all(
      files.map(async (file) => ({ file, raw: await readText(context, file, { fullFile: true }) }))
    );
    const literals = Object.assign(
      {},
      ...sources.map(({ raw }) => (raw === undefined ? {} : terraformLiterals(raw)))
    ) as Record<string, string>;
    const blocks = sources.flatMap(({ file, raw }) =>
      raw === undefined ? [] : readTerraformBlocks(raw, literals).map((block) => ({ file, raw, block }))
    );
    const packagingBuckets = new Set(
      sources.flatMap(({ raw }) =>
        raw === undefined
          ? []
          : [...raw.matchAll(/\bs3_bucket\s*=\s*aws_s3_bucket\.([A-Za-z0-9_-]+)/g)].map((match) => match[1]!)
      )
    );

    const dependencies: DependencyFact[] = [];
    const dependencyReferences = new Map<string, string>();
    const seen = new Set<string>();
    for (const { file, raw, block } of blocks) {
      let kind = RESOURCE_KINDS.find((entry) => entry.types.includes(block.type))?.kind;
      if (kind === undefined) continue;
      // An S3 bucket used to stage the Lambda zip is deployment machinery, not storage the
      // application reads or writes. Recreating it as an application dependency would be both
      // redundant and misleading.
      if (kind === 'object-storage' && packagingBuckets.has(block.name)) continue;
      if (block.type === 'aws_db_instance' || block.type === 'aws_rds_cluster') {
        const engine = block.attributes.engine;
        kind = engine === undefined ? undefined : databaseKindForEngine(engine);
        if (kind === undefined) continue;
      }
      if (block.type === 'aws_elasticache_cluster') {
        const engine = block.attributes.engine?.toLowerCase();
        if (engine !== 'redis' && engine !== 'valkey') continue;
      }

      const key = `${kind}:${block.name}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const assigned = dependencies.some((entry) => entry.kind === kind)
        ? factName(block.name)
        : defaultDependencyName(kind);
      dependencyReferences.set(`${block.type}.${block.name}`, assigned);
      for (const reference of block.body.matchAll(
        /^\s*(?:name|table_name)\s*=\s*((?:var|local)\.[A-Za-z0-9_]+)\s*$/gm
      )) {
        dependencyReferences.set(reference[1]!, assigned);
      }

      const instance = block.attributes.instance_class ?? block.attributes.node_type;
      const storage = Number.parseInt(block.attributes.allocated_storage ?? '', 10);
      const citation = citeFirstMatchOnly(file, raw, new RegExp(`resource\\s+"${block.type}"\\s+"${block.name}"`));
      dependencies.push({
        name: assigned,
        kind,
        extensions: [],
        consumedBy: [],
        addressedBy: [],
        ...(block.attributes.engine_version === undefined ? {} : { engineVersion: block.attributes.engine_version }),
        ...(instance !== undefined || Number.isInteger(storage)
          ? {
              sizeHint: {
                ...(instance === undefined ? {} : { instance }),
                ...(Number.isInteger(storage) && storage > 0 ? { storageGb: storage } : {})
              }
            }
          : {}),
        hostingEvidence: 'deployment-manifest',
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    const integrationFunctions = new Map<string, string>();
    for (const { block } of blocks.filter((entry) => entry.block.type === 'aws_apigatewayv2_integration')) {
      const functionName = /\baws_lambda_function\.([A-Za-z0-9_-]+)\.invoke_arn\b/.exec(block.body)?.[1];
      if (functionName !== undefined) integrationFunctions.set(block.name, functionName);
    }
    const routesByFunction = new Map<string, FunctionTrigger[]>();
    for (const { block } of blocks.filter((entry) => entry.block.type === 'aws_apigatewayv2_route')) {
      const integration = /\baws_apigatewayv2_integration\.([A-Za-z0-9_-]+)\.id\b/.exec(block.body)?.[1];
      const functionName = integration === undefined ? undefined : integrationFunctions.get(integration);
      const route = block.attributes.route_key;
      const parsedRoute = route === undefined ? undefined : /^(ANY|[A-Za-z]+)\s+(\/.*)$/.exec(route);
      if (functionName === undefined || parsedRoute === undefined || parsedRoute === null) continue;
      const triggers = routesByFunction.get(functionName) ?? [];
      triggers.push({
        type: 'http',
        method: parsedRoute[1]!.toUpperCase() === 'ANY' ? '*' : parsedRoute[1]!.toUpperCase(),
        path: parsedRoute[2]!
      });
      routesByFunction.set(functionName, triggers);
    }

    const services: ServiceFactInput[] = [];
    for (const { file, raw, block } of blocks.filter((entry) => entry.block.type === 'aws_lambda_function')) {
      const handler = block.attributes.handler;
      if (handler === undefined) continue;
      const entrypoint = functionEntrypointFor(handler, block.attributes.runtime, context.files);
      if (entrypoint === undefined) continue;
      const citation = citeFirstMatchOnly(
        file,
        raw,
        new RegExp(`resource\\s+"aws_lambda_function"\\s+"${block.name}"`),
        'functionEntrypoint'
      );
      const evidence = citation === undefined ? [] : [citation];
      const environmentVariables = terraformEnvironment(block.body, dependencyReferences, evidence);
      const serviceName = factName(block.name);
      const service: ServiceFactInput = {
        name: serviceName,
        path: entrypoint.includes('/') ? entrypoint.slice(0, entrypoint.lastIndexOf('/')) : '.',
        processType: `terraform:${block.name}`,
        language: languageForEntrypoint(entrypoint),
        exposesHttp: false,
        executionModel: 'per-request',
        functionEntrypoint: entrypoint,
        functionTriggers: routesByFunction.get(block.name) ?? [],
        environmentVariables,
        evidence,
        source: 'probe'
      };
      services.push(service);
      for (const variable of environmentVariables) {
        if (variable.dependencyName === undefined) continue;
        const dependency = dependencies.find((entry) => entry.name === variable.dependencyName);
        if (dependency === undefined) continue;
        if (!dependency.consumedBy.includes(serviceName)) dependency.consumedBy.push(serviceName);
        if (!dependency.addressedBy.includes(variable.name)) dependency.addressedBy.push(variable.name);
      }
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
