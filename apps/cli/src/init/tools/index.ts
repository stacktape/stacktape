/**
 * The tools an agent gets during analysis, and the only ones it gets.
 *
 * Vendor built-ins are switched off — Claude Code takes `--tools ""`, Codex takes
 * `features.shell_tool=false` plus a read-only sandbox — so this list is the agent's entire view of
 * the machine. That is what makes the guarantees enforceable rather than aspirational: there is no
 * second door to the filesystem, no shell, and no network.
 *
 * They are also shaped for this job rather than for general coding. `get_project_brief` hands over
 * everything the deterministic probes already worked out, so the agent spends its turns on judgement
 * instead of rediscovery. `grep` returns results already shaped like a citation, which makes citing
 * correctly the path of least resistance — tool design doing work that instructions do badly.
 */

import { z } from 'zod';
import {
  agentSubmissionSchema,
  mergeAgentSubmission,
  type AgentSubmission
} from '@stacktape/config-inference/facts/agent-submission';
import { renderFileTree } from '@stacktape/config-inference/scan/file-tree';
import type { ProjectFacts } from '@stacktape/config-inference/facts';
import { verifyFacts, type VerificationFinding } from '@stacktape/config-inference/verify';
import type { Workspace } from './workspace';

/** Caps, so one tool call cannot consume the user's token budget. */
const MAX_LINES_PER_READ = 400;
const MAX_GREP_MATCHES = 60;
const MAX_GREP_FILES_SCANNED = 3000;
const MAX_GLOB_MATCHES = 300;
const MAX_QUOTE_LENGTH = 200;

const isUnverified = (finding: VerificationFinding): boolean =>
  finding.outcome !== 'verified' && finding.outcome !== 'corroborated';

/**
 * Verify only claims the submission introduced, while the model is still present to repair them.
 *
 * Probe facts may have deliberately broad anchors and remain the baseline's responsibility. For an
 * existing service, the agent is checked only for fields it filled or strengthened; a brand-new
 * service/dependency must support the whole claim.
 */
const verifySubmission = async (
  submission: AgentSubmission,
  context: InitToolContext
): Promise<Array<{ path: string; message: string }>> => {
  const baselineServices = new Map(context.brief.services.map((service) => [service.path, service]));
  const newServiceSubjects = new Set<string>();
  const introducedServiceFields = new Set<string>();

  for (const submitted of submission.services) {
    const existing = baselineServices.get(submitted.path);
    if (existing === undefined) {
      newServiceSubjects.add(`service:${submitted.name}`);
      continue;
    }
    const subject = `service:${existing.name}`;
    if (submitted.exposesHttp && !existing.exposesHttp) introducedServiceFields.add(`${subject}:exposesHttp`);
    if (submitted.port !== undefined && existing.port === undefined) introducedServiceFields.add(`${subject}:port`);
    if (submitted.schedule !== undefined && existing.schedule === undefined) {
      introducedServiceFields.add(`${subject}:schedule`);
    }
    if (submitted.startCommand !== undefined && existing.startCommand === undefined) {
      introducedServiceFields.add(`${subject}:startCommand`);
    }
    if (submitted.buildCommand !== undefined && existing.buildCommand === undefined) {
      introducedServiceFields.add(`${subject}:buildCommand`);
    }
    if (submitted.containerEntrypoint !== undefined && existing.containerEntrypoint === undefined) {
      introducedServiceFields.add(`${subject}:containerEntrypoint`);
    }
    if (submitted.functionEntrypoint !== undefined && existing.functionEntrypoint === undefined) {
      introducedServiceFields.add(`${subject}:functionEntrypoint`);
    }
    if (submitted.functionTriggers.length > 0 && existing.functionTriggers.length === 0) {
      introducedServiceFields.add(`${subject}:functionTriggers`);
    }
  }

  const baselineDependencies = new Set(
    context.brief.dependencies.map((dependency) => `${dependency.kind}:${dependency.name}`)
  );
  const newDependencySubjects = new Set(
    submission.dependencies
      .filter((dependency) => !baselineDependencies.has(`${dependency.kind}:${dependency.name}`))
      .map((dependency) => `dependency:${dependency.name}`)
  );

  const merged = mergeAgentSubmission({ baseline: context.brief, submission });
  const verified = await verifyFacts({
    facts: merged,
    readFile: async (path) => {
      const result = await context.workspace.read(path);
      return 'contents' in result ? result.contents : null;
    }
  });

  return verified.findings
    .filter(isUnverified)
    .filter(
      (finding) =>
        newServiceSubjects.has(finding.subject) ||
        newDependencySubjects.has(finding.subject) ||
        (finding.field !== undefined && introducedServiceFields.has(`${finding.subject}:${finding.field}`))
    )
    .map((finding) => ({
      path: `${finding.subject}${finding.field === undefined ? '' : `.${finding.field}`}`,
      message: finding.detail
    }));
};

export type InitToolContext = {
  workspace: Workspace;
  /** Repository-relative POSIX paths the policy permits, computed once by the scan. */
  files: readonly string[];
  /** What the deterministic probes concluded before the agent ran. */
  brief: ProjectFacts;
  /** Called when a submission validates. The harness treats this as the task result. */
  onSubmit: (submission: AgentSubmission) => void;
};

export type InitTool = {
  name: string;
  description: string;
  inputJsonSchema: Record<string, unknown>;
  execute: (rawArgs: unknown, context: InitToolContext) => Promise<unknown>;
};

const parseArgs = <Schema extends z.ZodType>(schema: Schema, name: string, raw: unknown): z.output<Schema> => {
  const parsed = schema.safeParse(raw ?? {});
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`${name}: invalid arguments — ${detail}`);
  }
  return parsed.data;
};

const readFileArgs = z.object({
  path: z.string().min(1),
  startLine: z.number().int().positive().optional(),
  lineCount: z.number().int().positive().max(MAX_LINES_PER_READ).optional()
});

const globArgs = z.object({ pattern: z.string().min(1) });

const grepArgs = z.object({
  pattern: z.string().min(1),
  pathPrefix: z.string().optional(),
  ignoreCase: z.boolean().optional()
});

const listDirArgs = z.object({ path: z.string().default('.') });

/**
 * Glob matching over the precomputed listing.
 *
 * Deliberately not a filesystem walk: the listing has already had the access policy applied, so
 * matching against it means a pattern cannot reach a file the policy excluded, however it is
 * written.
 */
const matchesGlob = (path: string, pattern: string): boolean => {
  // Built by tokenising rather than by chained replaces. Chained replaces need a sentinel to stop
  // the single-star rule chewing through a double star, and a sentinel in the source is either a
  // character a path could legitimately contain or an invisible control code. Neither is worth it.
  let expression = '';
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index]!;
    if (character === '*') {
      if (pattern[index + 1] === '*') {
        // `a/**/b` must match `a/b` as well as `a/x/y/b`, so the trailing slash is consumed here.
        if (pattern[index + 2] === '/') {
          expression += '(?:.*/)?';
          index += 2;
        } else {
          expression += '.*';
          index += 1;
        }
      } else {
        expression += '[^/]*';
      }
      continue;
    }
    if (character === '?') {
      expression += '[^/]';
      continue;
    }
    expression += /[.+^${}()|[\]\\]/.test(character) ? `\\${character}` : character;
  }

  try {
    return new RegExp(`^${expression}$`).test(path);
  } catch {
    return false;
  }
};

export const createInitTools = (): InitTool[] => [
  {
    name: 'get_project_brief',
    description:
      'Everything already established about this project without reading any code: package manager, ' +
      'workspace layout, detected services and their commands, backing services, migrations, open questions, ' +
      'and the file tree. Call this FIRST. It replaces roughly a dozen exploratory reads.',
    inputJsonSchema: { type: 'object', properties: {} },
    execute: async (_raw, context) => ({
      brief: context.brief,
      fileCount: context.files.length,
      fileTree: renderFileTree(context.files)
    })
  },

  {
    name: 'read_file',
    description:
      'Read a text file from the project, by a path relative to the project root. Returns numbered lines — ' +
      'cite those numbers. Long files return a first page; pass startLine to read further. ' +
      'Environment files return their variable NAMES only, never values.',
    inputJsonSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path relative to the project root, using forward slashes.' },
        startLine: { type: 'integer', minimum: 1, description: 'First line to return (1-based).' },
        lineCount: {
          type: 'integer',
          minimum: 1,
          maximum: MAX_LINES_PER_READ,
          description: 'How many lines to return.'
        }
      },
      required: ['path']
    },
    execute: async (raw, context) => {
      const args = parseArgs(readFileArgs, 'read_file', raw);
      const result = await context.workspace.read(args.path);
      // Narrowed on the shapes rather than on `ok`, so each branch is reached by the thing that
      // distinguishes it: names for an environment file, text for everything else, a reason
      // otherwise.
      if ('environmentVariableNames' in result) {
        return {
          path: result.path,
          environmentVariableNames: result.environmentVariableNames,
          note: 'Environment values never leave this machine. Names are the whole signal.'
        };
      }
      if (!('contents' in result)) {
        return { error: result.message, reason: result.reason };
      }

      const allLines = result.contents.split(/\r?\n/);
      const startLine = Math.min(args.startLine ?? 1, Math.max(1, allLines.length));
      const count = args.lineCount ?? MAX_LINES_PER_READ;
      const endLine = Math.min(startLine + count - 1, allLines.length);
      const numbered = allLines
        .slice(startLine - 1, endLine)
        .map((line, index) => `${startLine + index}\t${line}`)
        .join('\n');

      return {
        path: result.path,
        startLine,
        endLine,
        totalLines: allLines.length,
        content: numbered,
        ...(endLine < allLines.length
          ? { more: `${allLines.length - endLine} further lines. Pass startLine: ${endLine + 1} to continue.` }
          : {})
      };
    }
  },

  {
    name: 'list_dir',
    description: 'List the immediate contents of a directory in the project.',
    inputJsonSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory relative to the project root. Defaults to the root.' }
      }
    },
    execute: async (raw, context) => {
      const args = parseArgs(listDirArgs, 'list_dir', raw);
      const prefix = args.path === '.' || args.path === '' ? '' : `${args.path.replace(/\/$/, '')}/`;
      const directories = new Set<string>();
      const files: string[] = [];

      for (const path of context.files) {
        if (!path.startsWith(prefix)) continue;
        const rest = path.slice(prefix.length);
        const slash = rest.indexOf('/');
        if (slash === -1) {
          files.push(rest);
        } else {
          directories.add(rest.slice(0, slash));
        }
      }

      return { path: args.path, directories: [...directories].sort(), files: files.sort() };
    }
  },

  {
    name: 'glob',
    description: 'Find files whose path matches a glob pattern, for example "apps/**/package.json".',
    inputJsonSchema: {
      type: 'object',
      properties: { pattern: { type: 'string', description: 'Glob pattern relative to the project root.' } },
      required: ['pattern']
    },
    execute: async (raw, context) => {
      const args = parseArgs(globArgs, 'glob', raw);
      const matches = context.files.filter((path) => matchesGlob(path, args.pattern));
      return {
        pattern: args.pattern,
        matches: matches.slice(0, MAX_GLOB_MATCHES),
        truncated: matches.length > MAX_GLOB_MATCHES
      };
    }
  },

  {
    name: 'grep',
    description:
      'Search file contents with a regular expression. Each match comes back as {file, line, quote} — ' +
      'exactly the shape a citation takes, so you can cite a match directly without re-reading the file.',
    inputJsonSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'JavaScript regular expression.' },
        pathPrefix: { type: 'string', description: 'Restrict the search to paths starting with this prefix.' },
        ignoreCase: { type: 'boolean', description: 'Match case-insensitively.' }
      },
      required: ['pattern']
    },
    execute: async (raw, context) => {
      const args = parseArgs(grepArgs, 'grep', raw);
      let expression: RegExp;
      try {
        expression = new RegExp(args.pattern, args.ignoreCase === true ? 'i' : '');
      } catch (error) {
        return { error: `Invalid regular expression: ${error instanceof Error ? error.message : String(error)}` };
      }

      const candidates = context.files.filter((path) =>
        args.pathPrefix === undefined ? true : path.startsWith(args.pathPrefix)
      );

      const matches: Array<{ file: string; line: number; quote: string }> = [];
      let scanned = 0;

      for (const path of candidates) {
        if (matches.length >= MAX_GREP_MATCHES || scanned >= MAX_GREP_FILES_SCANNED) break;
        const result = await context.workspace.read(path);
        // Environment files and credential files are skipped rather than searched: a regex is a
        // perfectly good way to ask for a value, and this is the door it would come through.
        if (!result.ok || !('contents' in result)) continue;
        scanned += 1;

        const lines = result.contents.split(/\r?\n/);
        for (let index = 0; index < lines.length; index += 1) {
          const line = lines[index] ?? '';
          if (!expression.test(line)) continue;
          matches.push({ file: result.path, line: index + 1, quote: line.trim().slice(0, MAX_QUOTE_LENGTH) });
          if (matches.length >= MAX_GREP_MATCHES) break;
        }
      }

      return {
        pattern: args.pattern,
        matches,
        filesScanned: scanned,
        truncated: matches.length >= MAX_GREP_MATCHES
      };
    }
  },

  {
    name: 'submit_facts',
    description:
      'Submit your findings. This is the task result — chat text is not. ' +
      'Report only what you can point at in the repository, and cite every claim with a file, a line and the ' +
      'text on that line. Anything you cannot establish belongs in "unknowns" rather than being guessed.',
    inputJsonSchema: {
      type: 'object',
      properties: {
        schemaVersion: { type: 'integer', const: 1 },
        services: { type: 'array', items: { type: 'object' } },
        dependencies: { type: 'array', items: { type: 'object' } },
        migrations: { type: 'array', items: { type: 'object' } },
        unknowns: { type: 'array', items: { type: 'object' } }
      },
      required: ['schemaVersion']
    },
    execute: async (raw, context) => {
      const parsed = agentSubmissionSchema.safeParse(raw);
      if (!parsed.success) {
        // Rejected with the specific problems rather than a generic failure, because this runs while
        // the model is still there and can fix it. A submission that fails after the session ends is
        // just a wasted run.
        return {
          accepted: false,
          problems: parsed.error.issues.map((issue) => ({
            path: issue.path.join('.') || '(root)',
            message: issue.message
          }))
        };
      }
      const verificationProblems = await verifySubmission(parsed.data, context);
      if (verificationProblems.length > 0) return { accepted: false, problems: verificationProblems };
      context.onSubmit(parsed.data);
      return { accepted: true };
    }
  }
];
