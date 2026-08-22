/** Facts declared by an AWS SAM template. */

import { posix } from 'node:path';
import type { DependencyFact, DependencyKind } from '../../facts/dependency';
import type { EnvironmentVariableUse, FunctionTrigger, ServiceFactInput } from '../../facts/service';
import { parseCloudFormationYaml } from '../cloudformation-yaml';
import { citeFirstMatchOnly, citeLine, readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';
import { declaredEnvironmentVariable } from './declared-environment';

type RecordValue = Record<string, unknown>;
type SamResource = { Type?: unknown; Properties?: RecordValue };

const isRecord = (value: unknown): value is RecordValue =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const resourceTypeToKind: Readonly<Record<string, DependencyKind>> = {
  'AWS::DynamoDB::Table': 'dynamodb',
  'AWS::SQS::Queue': 'queue',
  'AWS::SNS::Topic': 'topic',
  'AWS::S3::Bucket': 'object-storage'
};

const lowerFirst = (value: string): string => value.slice(0, 1).toLowerCase() + value.slice(1);
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalize = (value: string): string => value.replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/$/, '');
const blockFor = (raw: string, logicalId: string): { lines: string[]; start: number; end: number } | undefined => {
  const lines = raw.split(/\r?\n/);
  const start = lines.findIndex((line) => new RegExp(`^  ${escapeRegExp(logicalId)}:\\s*$`).test(line));
  if (start === -1) return undefined;
  const next = lines.findIndex((line, index) => index > start && /^  [A-Za-z0-9][A-Za-z0-9_-]*:\s*$/.test(line));
  return { lines, start, end: next === -1 ? lines.length : next };
};

const citeInBlock = (file: string, raw: string, logicalId: string, pattern: RegExp, field?: string) => {
  const block = blockFor(raw, logicalId);
  if (block === undefined) return undefined;
  const relative = block.lines.slice(block.start, block.end).findIndex((line) => pattern.test(line));
  return relative === -1 ? undefined : citeLine(file, block.lines, block.start + relative, field);
};

const languageFor = (path: string): string => {
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.ts') || path.endsWith('.tsx')) return 'typescript';
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) return 'javascript';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.rb')) return 'ruby';
  if (path.endsWith('.java')) return 'java';
  return 'unknown';
};

const entrypointFor = (
  files: readonly string[],
  templateDirectory: string,
  codeUriValue: unknown,
  handlerValue: unknown,
  runtimeValue: unknown
): string | undefined => {
  if (typeof handlerValue !== 'string') return undefined;
  const declaredCodeUri = normalize(typeof codeUriValue === 'string' ? codeUriValue : '.');
  const codeUri = normalize(
    templateDirectory === '.' ? declaredCodeUri : posix.join(templateDirectory, declaredCodeUri)
  );
  const handlerSeparator = handlerValue.lastIndexOf('.');
  const modulePath = normalize(handlerSeparator > 0 ? handlerValue.slice(0, handlerSeparator) : handlerValue);
  const runtime = typeof runtimeValue === 'string' ? runtimeValue : '';
  if (runtime.startsWith('java') || handlerValue.includes('::')) {
    const className = handlerValue.split('::')[0]?.trim();
    if (className === undefined || className === '') return undefined;
    const classPath = `${className.replace(/\./g, '/')}.java`;
    const matches = files.filter(
      (file) => file.endsWith(`/src/main/java/${classPath}`) || file.endsWith(`/${classPath}`) || file === classPath
    );
    const scoped = matches.filter((file) => templateDirectory === '.' || file.startsWith(`${templateDirectory}/`));
    if (scoped.length === 1) return scoped[0];
    if (matches.length === 1) return matches[0];
    return undefined;
  }
  const extensions = runtime.startsWith('python') ? ['py'] : ['ts', 'tsx', 'js', 'mjs', 'cjs', 'py', 'go', 'rb'];
  const baseCandidates = [
    posix.join(codeUri, modulePath),
    posix.join(codeUri, 'src', posix.basename(modulePath)),
    posix.join(codeUri.replace(/^dist(?=\/|$)/, 'src'), posix.basename(modulePath)),
    posix.join(codeUri, modulePath).replace(/(^|\/)dist\//, '$1src/')
  ].map(normalize);

  for (const base of baseCandidates) {
    for (const extension of extensions) {
      const candidate = `${base}.${extension}`;
      if (files.includes(candidate)) return candidate;
    }
  }

  const basename = posix.basename(modulePath).toLowerCase();
  const meaningfulSegments = codeUri
    .split('/')
    .filter((segment) => segment !== '' && segment !== '.' && !['dist', 'build', 'out', 'src'].includes(segment));
  const matches = files.filter((file) => {
    const stem = posix
      .basename(file)
      .replace(/\.[^.]+$/, '')
      .toLowerCase();
    return stem === basename && extensions.some((extension) => file.endsWith(`.${extension}`));
  });
  const ranked = matches
    .map((file) => ({
      file,
      score: meaningfulSegments.filter((segment) => file.includes(`/${segment}/`) || file.startsWith(`${segment}/`))
        .length
    }))
    .toSorted((left, right) => right.score - left.score || left.file.localeCompare(right.file));
  return ranked.length === 1 || (ranked[0]?.score ?? 0) > (ranked[1]?.score ?? -1) ? ranked[0]?.file : undefined;
};

const referencedLogicalId = (value: unknown, known: ReadonlySet<string>): string | undefined => {
  if (typeof value === 'string') {
    const prefix = value.split('.')[0] ?? value;
    if (known.has(prefix)) return prefix;
    return [...known].find((logicalId) => value.includes(`\${${logicalId}}`));
  }
  if (!isRecord(value)) return undefined;
  const reference = value.Ref ?? value['Fn::GetAtt'] ?? value['Fn::Sub'];
  if (Array.isArray(reference)) return referencedLogicalId(reference[0], known);
  return referencedLogicalId(reference, known);
};

const environmentVariablesFor = ({
  file,
  raw,
  logicalId,
  globals,
  properties,
  dependencyNames
}: {
  file: string;
  raw: string;
  logicalId: string;
  globals: RecordValue;
  properties: RecordValue;
  dependencyNames: ReadonlyMap<string, string>;
}): EnvironmentVariableUse[] => {
  const globalEnvironment =
    isRecord(globals.Environment) && isRecord(globals.Environment.Variables) ? globals.Environment.Variables : {};
  const localEnvironment =
    isRecord(properties.Environment) && isRecord(properties.Environment.Variables)
      ? properties.Environment.Variables
      : {};
  const environment = { ...globalEnvironment, ...localEnvironment };
  const known = new Set(dependencyNames.keys());

  return Object.entries(environment).map(([name, value]) => {
    const referenced = referencedLogicalId(value, known);
    const dependencyName = referenced === undefined ? undefined : dependencyNames.get(referenced);
    const citation =
      citeInBlock(file, raw, logicalId, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`)) ??
      citeFirstMatchOnly(file, raw, new RegExp(`^\\s*${escapeRegExp(name)}\\s*:`));
    const evidence = citation === undefined ? [] : [{ ...citation, quote: `${name}:` }];
    return declaredEnvironmentVariable({
      name,
      dependencyName,
      evidence,
      value
    });
  });
};

const triggersFor = (eventsValue: unknown, dependencyNames: ReadonlyMap<string, string>): FunctionTrigger[] => {
  if (!isRecord(eventsValue)) return [];
  const triggers: FunctionTrigger[] = [];
  for (const event of Object.values(eventsValue)) {
    if (!isRecord(event) || typeof event.Type !== 'string') continue;
    const properties = isRecord(event.Properties) ? event.Properties : {};
    if ((event.Type === 'Api' || event.Type === 'HttpApi') && typeof properties.Path === 'string') {
      triggers.push({
        type: 'http',
        method: typeof properties.Method === 'string' ? properties.Method : '*',
        path: properties.Path
      });
      continue;
    }
    const schedule = properties.Schedule ?? properties.ScheduleExpression;
    if ((event.Type === 'Schedule' || event.Type === 'ScheduleV2') && typeof schedule === 'string') {
      triggers.push({ type: 'schedule', rate: schedule });
      continue;
    }
    const referenceField = event.Type === 'SQS' ? 'Queue' : event.Type === 'SNS' ? 'Topic' : 'Bucket';
    const logicalId = referencedLogicalId(properties[referenceField], new Set(dependencyNames.keys()));
    const dependencyName = logicalId === undefined ? undefined : dependencyNames.get(logicalId);
    if (dependencyName === undefined) {
      triggers.push({
        type: 'unmapped',
        sourceType: `a ${event.Type} event whose resource could not be resolved`
      });
      continue;
    }
    if (event.Type === 'SQS') {
      triggers.push({
        type: 'queue',
        dependencyName,
        ...(typeof properties.BatchSize === 'number' ? { batchSize: properties.BatchSize } : {})
      });
    } else if (event.Type === 'SNS') {
      triggers.push({ type: 'topic', dependencyName });
    } else if (event.Type === 'S3') {
      triggers.push({
        type: 'object-storage',
        dependencyName,
        ...(typeof properties.Events === 'string' ? { eventType: properties.Events } : {})
      });
    } else {
      triggers.push({ type: 'unmapped', sourceType: `a ${event.Type} event` });
    }
  }
  return triggers;
};

export const awsSamProbe: Probe = {
  name: 'aws-sam',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const templatePaths = context.files
      .filter((path) => /(^|\/)(?:template|sam-template)\.ya?ml$/.test(path))
      .slice(0, 20);
    if (templatePaths.length === 0) return {};

    const services: ServiceFactInput[] = [];
    const dependencies: DependencyFact[] = [];
    for (const templatePath of templatePaths) {
      // oxlint-disable-next-line no-await-in-loop -- each template is a separate app boundary.
      const raw = await readText(context, templatePath, { fullFile: true });
      if (raw === undefined || !/AWS::Serverless-2016-10-31/.test(raw)) continue;

      let parsed: unknown;
      try {
        parsed = parseCloudFormationYaml(raw);
      } catch {
        continue;
      }
      if (!isRecord(parsed) || !isRecord(parsed.Resources)) continue;
      const resources = parsed.Resources as Record<string, SamResource>;
      const globals = isRecord(parsed.Globals) && isRecord(parsed.Globals.Function) ? parsed.Globals.Function : {};
      const templateDirectory = posix.dirname(templatePath) === '' ? '.' : posix.dirname(templatePath);

      const dependencyNames = new Map<string, string>();
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (typeof resource?.Type === 'string' && resourceTypeToKind[resource.Type] !== undefined) {
          dependencyNames.set(logicalId, lowerFirst(logicalId));
        }
      }

      const functions: Array<{
        logicalId: string;
        name: string;
        properties: RecordValue;
        service: ServiceFactInput;
      }> = [];
      for (const [logicalId, resource] of Object.entries(resources)) {
        if (resource?.Type !== 'AWS::Serverless::Function') continue;
        const properties = isRecord(resource.Properties) ? resource.Properties : {};
        const entrypoint = entrypointFor(
          context.files,
          templateDirectory,
          properties.CodeUri ?? globals.CodeUri,
          properties.Handler,
          properties.Runtime ?? globals.Runtime
        );
        if (entrypoint === undefined) continue;
        const name = lowerFirst(logicalId.replace(/Function$/, ''));
        // oxlint-disable-next-line no-await-in-loop -- one small handler read per declared SAM function.
        const source = await readText(context, entrypoint);
        const sourceCitation =
          source === undefined
            ? undefined
            : citeFirstMatchOnly(
                entrypoint,
                source,
                /(?:export\s+(?:const|async\s+function|function)\s+\w+|def\s+\w+\s*\(|(?:module\.)?exports(?:\.\w+)?\s*=|class\s+\w+)/,
                'functionEntrypoint'
              );
        const functionTriggers = triggersFor(properties.Events, dependencyNames);
        const environmentVariables = environmentVariablesFor({
          file: templatePath,
          raw,
          logicalId,
          globals,
          properties,
          dependencyNames
        });
        const samEvidence = [
          citeInBlock(templatePath, raw, logicalId, /^\s*Handler:\s*/, 'functionEntrypoint'),
          citeInBlock(
            templatePath,
            raw,
            logicalId,
            /^\s*Type:\s*(?:Api|HttpApi|SQS|SNS|S3|Schedule)\s*$/,
            'functionTriggers'
          ),
          ...functionTriggers.flatMap((trigger) => {
            const value =
              trigger.type === 'http' ? trigger.path : trigger.type === 'schedule' ? trigger.rate : undefined;
            return value === undefined
              ? []
              : [citeInBlock(templatePath, raw, logicalId, new RegExp(escapeRegExp(value)), 'functionTriggers')];
          })
        ].filter((citation) => citation !== undefined);
        const service: ServiceFactInput = {
          name,
          path: posix.dirname(entrypoint) === '' ? '.' : posix.dirname(entrypoint),
          processType: logicalId,
          language: languageFor(entrypoint),
          framework: 'aws-sam',
          exposesHttp: false,
          executionModel: 'per-request',
          functionEntrypoint: entrypoint,
          functionTriggers,
          environmentVariables,
          evidence: [sourceCitation, ...samEvidence].filter((citation) => citation !== undefined),
          source: 'probe'
        };
        functions.push({ logicalId, name, properties, service });
      }

      for (const [logicalId, name] of dependencyNames) {
        const resource = resources[logicalId];
        const kind = typeof resource?.Type === 'string' ? resourceTypeToKind[resource.Type] : undefined;
        if (kind === undefined) continue;
        const consumers = functions
          .filter(
            ({ properties, service }) =>
              JSON.stringify(properties).includes(logicalId) ||
              (service.environmentVariables ?? []).some((variable) => variable.dependencyName === name)
          )
          .map(({ name: functionName }) => functionName);
        // Ignore descriptor resources unrelated to any function. Reproducing an entire existing stack
        // is not init's job, and relationships such as a queue's dead-letter queue need richer facts.
        if (consumers.length === 0) continue;
        const evidence = [
          citeInBlock(templatePath, raw, logicalId, new RegExp(escapeRegExp(String(resource?.Type))))
        ].filter((citation) => citation !== undefined);
        dependencies.push({
          name,
          kind,
          extensions: [],
          consumedBy: consumers,
          addressedBy: [
            ...new Set(
              functions.flatMap(({ service }) =>
                (service.environmentVariables ?? [])
                  .filter((variable) => variable.dependencyName === name)
                  .map((variable) => variable.name)
              )
            )
          ],
          hostingEvidence: 'deployment-manifest',
          evidence,
          source: 'probe'
        });
      }

      services.push(...functions.map(({ service }) => service));
    }

    return {
      ...(services.length === 0 ? {} : { services }),
      ...(dependencies.length === 0 ? {} : { dependencies })
    };
  }
};
