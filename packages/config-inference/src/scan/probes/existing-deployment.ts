/**
 * What already deploys this project.
 *
 * Every other probe answers "what does this application need". This one answers "which deployment
 * system has a declaration in the repository", and the two lead somewhere different. A manifest is
 * not proof that anything is running, but it is enough to warn that Stacktape will create a separate
 * stack and will not adopt or change whatever that declaration may manage.
 *
 * The detection is deliberately conservative. A file's presence is only evidence when that file
 * means one thing — `sst.config.ts` does, `template.yaml` and `app.yaml` do not, so the ambiguous
 * ones have to prove themselves from their contents before they count. A false positive here is
 * worse than a miss: telling somebody we found their Terraform when we found a `.tf` file belonging
 * to a tutorial they never ran is the kind of wrongness that makes the rest of the output suspect.
 */

import {
  AWS_DEPLOYMENT_TOOLS,
  type CloudflareRuntimeBinding,
  type DeploymentRuntimeConstraint,
  type DeploymentTool,
  type ExistingDeploymentFact
} from '../../facts/existing-deployment';
import type { Citation } from '../../facts/citation';
import { posix } from 'node:path';
import { parse as parseToml } from 'smol-toml';
import * as ts from 'typescript';
import yaml from 'yaml';
import { readText, type Probe, type ProbeContext, type ProbeOutput } from '../probe';

const CLOUDFLARE_MANIFEST_NAMES = ['wrangler.toml', 'wrangler.json', 'wrangler.jsonc'] as const;

/** Files whose presence, on its own, identifies the tool that owns this repository's deployment. */
const UNAMBIGUOUS_FILES: ReadonlyArray<{
  files: readonly string[];
  tool: DeploymentTool;
}> = [
  {
    files: ['serverless.yml', 'serverless.yaml', 'serverless.ts', 'serverless.js'],
    tool: 'serverless-framework'
  },
  { files: ['sst.config.ts', 'sst.config.js', 'sst.json'], tool: 'sst' },
  { files: ['cdk.json'], tool: 'aws-cdk' },
  { files: ['Pulumi.yaml', 'Pulumi.yml'], tool: 'pulumi' },
  { files: ['samconfig.toml', 'samconfig.yaml'], tool: 'aws-sam' },
  { files: ['render.yaml', 'render.yml'], tool: 'render' },
  { files: ['fly.toml'], tool: 'fly' },
  { files: ['vercel.json'], tool: 'vercel' },
  { files: ['netlify.toml'], tool: 'netlify' },
  { files: ['railway.json', 'railway.toml'], tool: 'railway' },
  {
    files: CLOUDFLARE_MANIFEST_NAMES,
    tool: 'cloudflare-workers'
  },
  {
    files: ['Chart.yaml', 'kustomization.yaml', 'kustomization.yml'],
    tool: 'kubernetes'
  }
];

const INCIDENTAL_DIRECTORY_NAMES = new Set([
  '__fixtures__',
  'demo',
  'demos',
  'fixture',
  'fixtures',
  'example',
  'examples',
  'docs',
  'documentation',
  'playground',
  'playgrounds',
  'sample',
  'samples',
  'template',
  'templates',
  'test',
  'tests'
]);

const APPLICATION_MANIFEST_NAMES = [
  'package.json',
  'deno.json',
  'deno.jsonc',
  'Cargo.toml',
  'pyproject.toml',
  'requirements.txt',
  'go.mod'
] as const;

const LOCAL_PACKAGE_LOCK_NAMES = ['bun.lock', 'bun.lockb', 'package-lock.json', 'pnpm-lock.yaml', 'yarn.lock'] as const;

/**
 * A package beside an example is common supporting material, not proof that the root repository
 * deploys it. Cloudflare candidates use the stronger active-directory set assembled from the root
 * workspace declaration or a standalone package boundary with an explicit production Wrangler
 * command. Other deployment tools retain the older application-manifest exception until they have
 * equally specific activation evidence.
 */
const isIncidentalManifest = (
  files: readonly string[],
  directories: readonly string[],
  activeDirectories?: ReadonlySet<string>
): boolean => {
  if (!directories.some((segment) => INCIDENTAL_DIRECTORY_NAMES.has(segment.toLowerCase()))) return false;
  const directory = directories.join('/');
  if (activeDirectories !== undefined) return !activeDirectories.has(directory);
  return !APPLICATION_MANIFEST_NAMES.some((name) => files.includes(`${directory}/${name}`));
};

const normalizeWorkspacePattern = (value: string): string =>
  value.trim().replaceAll('\\', '/').replace(/^\.\//, '').replace(/\/$/, '');

const workspaceSegmentMatches = (pattern: string, value: string): boolean => {
  // A regex translation makes adjacent `*` tokens adjacent greedy groups. A workspace pattern is
  // untrusted repository input, so a harmless-looking run of stars can otherwise make init spend
  // seconds backtracking. Dynamic programming keeps the same segment-local `*`/`?` semantics with
  // work bounded by the pattern and path lengths.
  let previous = Array.from({ length: value.length + 1 }, (_, index) => index === 0);
  for (const character of pattern) {
    const current = Array.from({ length: value.length + 1 }, () => false);
    current[0] = character === '*' && previous[0]!;
    for (let valueIndex = 1; valueIndex <= value.length; valueIndex += 1) {
      current[valueIndex] =
        character === '*'
          ? previous[valueIndex]! || current[valueIndex - 1]!
          : (character === '?' || character === value[valueIndex - 1]) && previous[valueIndex - 1]!;
    }
    previous = current;
  }
  return previous[value.length]!;
};

const workspacePatternMatches = (pattern: string, directory: string): boolean => {
  const patternSegments = normalizeWorkspacePattern(pattern).split('/');
  const directorySegments = normalizeWorkspacePattern(directory).split('/');
  const memo = new Map<string, boolean>();

  const matches = (patternIndex: number, directoryIndex: number): boolean => {
    const key = `${patternIndex}:${directoryIndex}`;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;

    let result: boolean;
    if (patternIndex === patternSegments.length) {
      result = directoryIndex === directorySegments.length;
      memo.set(key, result);
      return result;
    }
    const segment = patternSegments[patternIndex]!;
    if (segment === '**') {
      result =
        matches(patternIndex + 1, directoryIndex) ||
        (directoryIndex < directorySegments.length && matches(patternIndex, directoryIndex + 1));
    } else {
      result =
        directoryIndex < directorySegments.length &&
        workspaceSegmentMatches(segment, directorySegments[directoryIndex]!) &&
        matches(patternIndex + 1, directoryIndex + 1);
    }
    memo.set(key, result);
    return result;
  };

  return matches(0, 0);
};

const isWorkspaceMember = (directory: string, patterns: readonly string[]): boolean => {
  let included = false;
  for (const originalPattern of patterns) {
    const normalized = normalizeWorkspacePattern(originalPattern);
    const excluded = normalized.startsWith('!');
    const pattern = excluded ? normalized.slice(1) : normalized;
    if (pattern !== '' && workspacePatternMatches(pattern, directory)) included = !excluded;
  }
  return included;
};

const boundedWorkspacePatterns = (entries: readonly unknown[]): string[] =>
  entries
    .filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 256)
    .slice(0, 128);

const packageWorkspacePatterns = (raw: string | null | undefined): string[] => {
  if (raw === null || raw === undefined) return [];
  try {
    const parsed = JSON.parse(raw) as { workspaces?: unknown };
    if (Array.isArray(parsed.workspaces)) {
      return boundedWorkspacePatterns(parsed.workspaces);
    }
    const packages = (parsed.workspaces as { packages?: unknown } | undefined)?.packages;
    return Array.isArray(packages) ? boundedWorkspacePatterns(packages) : [];
  } catch {
    return [];
  }
};

const pnpmWorkspacePatterns = (raw: string | undefined): string[] => {
  if (raw === undefined) return [];
  try {
    const document = yaml.parseDocument(raw);
    if (document.errors.length > 0) return [];
    const parsed = document.toJSON() as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return [];
    const packages = (parsed as { packages?: unknown }).packages;
    return Array.isArray(packages) ? boundedWorkspacePatterns(packages) : [];
  } catch {
    return [];
  }
};

const DIRECT_WRANGLER_DEPLOY =
  /^(?:(?:npx|bunx)\s+|bun\s+x\s+|npm\s+(?:exec|x)\s+|pnpm(?:\s+(?:exec|dlx))?\s+|yarn(?:\s+run)?\s+)?wrangler\s+(?:deploy|versions\s+(?:deploy|upload))(?:\s|$)/;

const hasDirectWranglerDeploymentScript = (raw: string | null | undefined): boolean => {
  if (raw === null || raw === undefined) return false;
  try {
    const parsed = JSON.parse(raw) as { scripts?: unknown };
    if (parsed.scripts === null || typeof parsed.scripts !== 'object' || Array.isArray(parsed.scripts)) return false;
    return Object.entries(parsed.scripts).some(
      ([name, command]) =>
        ['deploy', 'publish'].includes(name) &&
        typeof command === 'string' &&
        DIRECT_WRANGLER_DEPLOY.test(command.trim())
    );
  } catch {
    return false;
  }
};

/** Resolve only the incidental directories the repository itself identifies as deployable apps. */
const activeCloudflareApplicationDirectories = async (context: ProbeContext): Promise<Set<string>> => {
  const directories = [
    ...new Set(
      context.files
        .filter((path) => CLOUDFLARE_MANIFEST_NAMES.some((name) => path.endsWith(`/${name}`)))
        .map((path) => posix.dirname(path))
        .filter((directory) =>
          directory.split('/').some((segment) => INCIDENTAL_DIRECTORY_NAMES.has(segment.toLowerCase()))
        )
    )
  ]
    .filter((directory) => directory.split('/').length <= 4)
    .slice(0, 32);
  if (directories.length === 0) return new Set();

  const [rootPackage, pnpmWorkspace, ...localPackages] = await Promise.all([
    context.files.includes('package.json') ? context.readPrivileged('package.json') : Promise.resolve(null),
    readText(context, 'pnpm-workspace.yaml'),
    ...directories.map((directory) =>
      context.files.includes(`${directory}/package.json`)
        ? context.readPrivileged(`${directory}/package.json`)
        : Promise.resolve(null)
    )
  ]);
  const workspacePatterns = [...packageWorkspacePatterns(rootPackage), ...pnpmWorkspacePatterns(pnpmWorkspace)];

  return new Set(
    directories.filter((directory, index) => {
      const hasApplicationManifest = APPLICATION_MANIFEST_NAMES.some((name) =>
        context.files.includes(`${directory}/${name}`)
      );
      return (
        hasApplicationManifest &&
        (isWorkspaceMember(directory, workspacePatterns) ||
          (LOCAL_PACKAGE_LOCK_NAMES.some((name) => context.files.includes(`${directory}/${name}`)) &&
            hasDirectWranglerDeploymentScript(localPackages[index]!)))
      );
    })
  );
};

/**
 * Deployment manifests often live beside an app in a monorepo (`apps/api/fly.toml`). Consider a
 * bounded nested location, but never turn a tutorial or test fixture into a claim about what runs
 * in production. Four directory segments covers conventional workspace layouts without searching
 * arbitrary vendored trees.
 */
const findManifests = (
  files: readonly string[],
  names: readonly string[],
  activeDirectories?: ReadonlySet<string>
): string[] =>
  files.filter((path) => {
    const segments = path.split('/');
    const name = segments.at(-1);
    const directories = segments.slice(0, -1);
    return (
      name !== undefined &&
      names.includes(name) &&
      directories.length <= 4 &&
      !isIncidentalManifest(files, directories, activeDirectories)
    );
  });

const findManifest = (files: readonly string[], names: readonly string[]): string | undefined =>
  findManifests(files, names)[0];

/**
 * Files that need their contents read before they count.
 *
 * `template.yaml` is the most common filename in the world; only the CloudFormation marker inside
 * makes it a deployment. The same reasoning applies to a `*.tf` that configures a provider we do not
 * care about.
 */
const CONFIRMED_BY_CONTENTS: ReadonlyArray<{
  files: readonly string[];
  pattern: RegExp;
  tool: DeploymentTool;
}> = [
  {
    files: ['template.yaml', 'template.yml'],
    pattern: /^(AWSTemplateFormatVersion|Transform:\s*AWS::Serverless)/m,
    tool: 'aws-sam'
  },
  {
    // A Procfile is platform-neutral process metadata. Heroku's app manifest needs a field that is
    // specific to its deployment schema before we name Heroku in front of the user.
    files: ['app.json'],
    pattern: /"(?:addons|formation|buildpacks|stack)"\s*:/,
    tool: 'heroku'
  }
];

/** Where a project keeps Terraform, so a stray `.tf` in a fixtures directory does not count. */
const isTerraformFile = (path: string): boolean => {
  if (!path.endsWith('.tf') && !path.endsWith('.tf.json')) return false;
  const directory = path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '';
  return (
    directory === '' ||
    directory === 'infra' ||
    directory === 'infrastructure' ||
    directory === 'terraform' ||
    directory === 'deploy' ||
    directory.startsWith('terraform/') ||
    directory.startsWith('infra/') ||
    directory.startsWith('infrastructure/')
  );
};

/**
 * Does this Terraform, or Pulumi, actually point at AWS?
 *
 * No word-boundary anchors. The alternative that matters most ends in a double quote, and a word
 * boundary after a quote requires a word character next — the next character is a space, so the
 * anchor made the one pattern this function exists for unmatchable.
 */
const MENTIONS_AWS = /provider\s+"aws"|hashicorp\/aws|@pulumi\/aws|pulumi_aws|aws:region/;

/**
 * Whether any of these files says this project targets AWS.
 *
 * Reads a bounded sample rather than everything: eight files is plenty to find a provider block, and
 * a large infrastructure repository has hundreds.
 */
const anyMentionsAws = async (context: ProbeContext, candidates: readonly string[]): Promise<boolean> => {
  const sampled = await Promise.all(candidates.slice(0, 8).map(async (file) => readText(context, file)));
  return sampled.some((contents) => contents !== undefined && MENTIONS_AWS.test(contents));
};

/** Cite only a declaration key/token, never a whole one-line manifest that may also contain values. */
const declarationCitation = (path: string, raw: string | undefined, confirm?: RegExp): Citation | undefined => {
  if (raw === undefined) return undefined;
  const lines = raw.split(/\r?\n/);
  if (confirm !== undefined) {
    for (const [index, line] of lines.entries()) {
      const match = new RegExp(confirm.source, confirm.flags.replaceAll('g', '').replaceAll('y', '')).exec(line)?.[0];
      if (match !== undefined)
        return {
          file: path,
          line: index + 1,
          quote: match.trim().slice(0, 200)
        };
    }
  }

  const index = lines.findIndex((line) => {
    const trimmed = line.trim();
    return (
      trimmed !== '' &&
      !trimmed.startsWith('#') &&
      !trimmed.startsWith('//') &&
      !trimmed.startsWith('/*') &&
      !trimmed.startsWith('*')
    );
  });
  if (index === -1) return undefined;
  const line = lines[index]!;
  const token = /(?:["'][A-Za-z_$][A-Za-z0-9_$.-]*["']|[A-Za-z_$][A-Za-z0-9_$.-]*)\s*(?=[:=({])/.exec(line)?.[0];
  return {
    file: path,
    line: index + 1,
    quote: (token?.trim() || line.trim().slice(0, 1)).slice(0, 200)
  };
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const CLOUDFLARE_BINDING_KEYS: Readonly<Record<string, CloudflareRuntimeBinding>> = {
  ai: 'ai',
  analytics_engine_datasets: 'analytics-engine',
  browser: 'browser',
  d1_databases: 'd1',
  dispatch_namespaces: 'dispatch-namespace',
  durable_objects: 'durable-object',
  hyperdrive: 'hyperdrive',
  images: 'images',
  kv_namespaces: 'kv',
  mtls_certificates: 'mtls-certificate',
  pipelines: 'pipeline',
  queues: 'queue',
  r2_buckets: 'r2',
  services: 'service',
  vectorize: 'vectorize',
  workflows: 'workflow'
};

/** Parse Wrangler's data formats without loading or executing a repository module. */
const parseWrangler = (path: string, raw: string): Record<string, unknown> | undefined => {
  try {
    let parsed: unknown;
    if (path.endsWith('.toml')) {
      parsed = parseToml(raw);
    } else {
      const result = ts.parseConfigFileTextToJson(path, raw);
      if (result.error !== undefined) return undefined;
      parsed = result.config;
    }
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
};

/** Cite only a runtime key. A binding declaration may share its line with IDs or credentials. */
const cloudflareKeyCitation = (path: string, raw: string, key: string): Citation | undefined => {
  if (!path.endsWith('.toml')) {
    const source = ts.parseJsonText(path, raw);
    const expression = source.statements[0]?.expression;
    if (expression !== undefined && ts.isObjectLiteralExpression(expression)) {
      const property = expression.properties.find((candidate): candidate is ts.PropertyAssignment => {
        if (!ts.isPropertyAssignment(candidate)) return false;
        return (
          (ts.isStringLiteralLike(candidate.name) || ts.isIdentifier(candidate.name)) && candidate.name.text === key
        );
      });
      if (property !== undefined) {
        return {
          file: path,
          line: source.getLineAndCharacterOfPosition(property.name.getStart(source)).line + 1,
          quote: key
        };
      }
    }
    return undefined;
  }

  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matcher = new RegExp(`^\\s*(?:["']?${escaped}["']?\\s*[:=]|\\[+\\s*${escaped}\\s*\\]+)`);
  for (const [index, line] of raw.split(/\r?\n/).entries()) {
    if (!matcher.test(line)) continue;
    return { file: path, line: index + 1, quote: key };
  }
  return undefined;
};

const safeRepositoryPath = (value: string): string | undefined => {
  const normalized = posix.normalize(value.replaceAll('\\', '/')).replace(/^\.\//, '');
  if (
    normalized === '' ||
    normalized === '.' ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized)
  ) {
    return undefined;
  }
  return normalized;
};

const hasConfiguredValue = (value: unknown, depth = 0): boolean => {
  // Wrangler binding declarations are shallow. Treat a contrived deeper structure as configured
  // instead of recursing through attacker-controlled JSON without a bound.
  if (depth >= 6) return true;
  if (Array.isArray(value)) return value.some((entry) => hasConfiguredValue(entry, depth + 1));
  if (isRecord(value)) return Object.values(value).some((entry) => hasConfiguredValue(entry, depth + 1));
  if (typeof value === 'string') return value.trim() !== '';
  return value !== undefined && value !== null && value !== false;
};

/**
 * A Wrangler file is deployment evidence by presence, but only literal Worker entrypoint/binding
 * keys prove that an application service depends on Cloudflare runtime semantics.
 */
const cloudflareRuntimeConstraint = ({
  path,
  raw
}: {
  path: string;
  raw: string | undefined;
}): DeploymentRuntimeConstraint | undefined => {
  if (raw === undefined) return undefined;
  const parsed = parseWrangler(path, raw);
  if (parsed === undefined) return undefined;

  const rawEntrypoint = typeof parsed.main === 'string' && parsed.main.trim() !== '' ? parsed.main : undefined;
  const bindingEntries = Object.entries(CLOUDFLARE_BINDING_KEYS).filter(([key]) => hasConfiguredValue(parsed[key]));
  if (rawEntrypoint === undefined && bindingEntries.length === 0) return undefined;

  const manifestDirectory = posix.dirname(path);
  const scope = manifestDirectory === '.' ? '.' : manifestDirectory;
  const entrypoint =
    rawEntrypoint === undefined
      ? undefined
      : safeRepositoryPath(scope === '.' ? rawEntrypoint : posix.join(scope, rawEntrypoint));
  const evidence = [
    ...(rawEntrypoint === undefined ? [] : [cloudflareKeyCitation(path, raw, 'main')]),
    ...bindingEntries.map(([key]) => cloudflareKeyCitation(path, raw, key))
  ].filter((citation): citation is Citation => citation !== undefined);

  return {
    platform: 'cloudflare-worker',
    scope,
    ...(entrypoint === undefined ? {} : { entrypoint }),
    bindings: [...new Set(bindingEntries.map(([, binding]) => binding))],
    evidence: evidence.slice(0, 6)
  };
};

export const existingDeploymentProbe: Probe = {
  name: 'existing-deployment',
  run: async (context: ProbeContext): Promise<ProbeOutput> => {
    const activeCloudflareDirectories = await activeCloudflareApplicationDirectories(context);
    // Which files to look at is decided first, and entirely from the file list, so the reads that
    // follow can all happen at once.
    const candidates: Array<{
      tool: DeploymentTool;
      path: string;
      confirm?: RegExp;
    }> = [];
    for (const { files, tool } of UNAMBIGUOUS_FILES) {
      const paths =
        tool === 'cloudflare-workers'
          ? findManifests(context.files, files, activeCloudflareDirectories).slice(0, 32)
          : [findManifest(context.files, files)];
      for (const path of paths) {
        if (path !== undefined) candidates.push({ tool, path });
      }
    }
    for (const { files, pattern, tool } of CONFIRMED_BY_CONTENTS) {
      const path = findManifest(context.files, files);
      if (path !== undefined) candidates.push({ tool, path, confirm: pattern });
    }

    const terraformFiles = context.files.filter(isTerraformFile);
    if (terraformFiles[0] !== undefined) candidates.push({ tool: 'terraform', path: terraformFiles[0] });

    if (candidates.length === 0) return {};

    const read = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        raw: await readText(context, candidate.path, candidate.tool === 'cloudflare-workers' ? { fullFile: true } : {})
      }))
    );

    // Terraform and Pulumi deploy to any cloud, so whether they manage AWS is a question about their
    // files rather than about the tool. Pulumi's own `Pulumi.yaml` rarely names a cloud — the
    // provider is a dependency of the program and the region lives in the per-stack file — so the
    // answer comes from wherever this project would have had to declare it.
    const [terraformTargetsAws, pulumiTargetsAws] = await Promise.all([
      terraformFiles.length > 0 ? anyMentionsAws(context, terraformFiles) : Promise.resolve(false),
      candidates.some((candidate) => candidate.tool === 'pulumi')
        ? anyMentionsAws(
            context,
            context.files.filter(
              (file) =>
                /^Pulumi\..+\.ya?ml$/.test(file) || ['package.json', 'requirements.txt', 'go.mod'].includes(file)
            )
          )
        : Promise.resolve(false)
    ]);

    const found = new Map<DeploymentTool, ExistingDeploymentFact>();
    for (const { tool, path, confirm, raw } of read) {
      if (confirm !== undefined && (raw === undefined || !confirm.test(raw))) continue;

      const managesAws =
        tool === 'terraform'
          ? terraformTargetsAws
          : tool === 'pulumi'
            ? pulumiTargetsAws
            : AWS_DEPLOYMENT_TOOLS.has(tool);

      const citation = declarationCitation(path, raw, confirm);
      const runtimeConstraint = tool === 'cloudflare-workers' ? cloudflareRuntimeConstraint({ path, raw }) : undefined;
      const existing = found.get(tool);
      if (existing !== undefined) {
        if (citation !== undefined && !existing.evidence.some((item) => item.file === citation.file)) {
          existing.evidence.push(citation);
        }
        if (
          runtimeConstraint !== undefined &&
          !existing.runtimeConstraints.some(
            (constraint) =>
              constraint.platform === runtimeConstraint.platform && constraint.scope === runtimeConstraint.scope
          )
        ) {
          existing.runtimeConstraints.push(runtimeConstraint);
        }
        continue;
      }
      found.set(tool, {
        tool,
        managesAws,
        runtimeConstraints: runtimeConstraint === undefined ? [] : [runtimeConstraint],
        evidence: citation === undefined ? [] : [citation],
        source: 'probe'
      });
    }

    return found.size === 0 ? {} : { existingDeployments: [...found.values()] };
  }
};
