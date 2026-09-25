/**
 * Renders a harness run's report again from its saved evidence, with the current renderer, into a new file:
 *
 *   bun scripts/perf/cli-report-rerender.ts --run <run directory> --out <new file outside it> --reason <why>
 *
 * It reads only what the run saved: `harness-config.json`, `outer.json`, `inner-report.json` and `report.json`, each
 * parsed as `unknown` and narrowed field by field (`saved-run.ts`). It measures nothing, writes nothing into the run
 * directory and never replaces a file. It refuses to render when any input or field it needs is missing or of another
 * type. It also recomputes the summaries and the paired comparison from the saved samples and refuses unless they
 * equal the saved ones, so no rendered number is invented or drifted.
 *
 * The output starts with a provenance note:
 * - every input's SHA-256, and the SHA-256 of the renderer sources;
 * - the original report's SHA-256;
 * - every line the new rendering removed from the original, and every line it added.
 * The body is deterministic: rendering the same run twice gives the same bytes.
 */
import type { ReportInput } from './cli-report';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import { comparePairedStartup, describeSettings, renderReport, summarizeSamples } from './cli-report';
import { compareSourceIdentities } from './measurement-context';
import { readConfig, readOuter, readReport, readToolVersions } from './saved-run';

const INPUTS = ['harness-config.json', 'outer.json', 'inner-report.json', 'report.json'] as const;
/** The modules whose code decides what is accepted and what is rendered. */
const RENDERER_SOURCES = [
  'cli-report.ts',
  'cli-report-rerender.ts',
  'saved-run.ts',
  'cli-timing-analysis.ts',
  'measurement-context.ts'
];

const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

/**
 * The report input a run's saved files describe, each read as `unknown` and narrowed, and checked against what the
 * run itself computed.
 */
export const reportInputFromSavedRun = (saved: {
  config: unknown;
  outer: unknown;
  inner: unknown;
  report: unknown;
}): ReportInput => {
  const config = readConfig(saved.config);
  const outer = readOuter(saved.outer);
  const toolVersions = readToolVersions(saved.inner);
  const { samples, savedSummaries, savedPaired } = readReport(saved.report);
  const summaries = summarizeSamples(samples);
  if (JSON.stringify(summaries) !== JSON.stringify(savedSummaries)) {
    throw new Error('The summaries recomputed from the saved samples differ from the saved ones; nothing is rendered.');
  }
  const reference = config.installs[0]?.name ?? null;
  const paired = reference ? comparePairedStartup({ samples, reference }) : [];
  if (JSON.stringify(paired) !== JSON.stringify(savedPaired)) {
    throw new Error(
      'The paired comparison recomputed from the saved samples differs from the saved one; nothing is rendered.'
    );
  }
  const before = outer.buildSourceBefore;
  const after = outer.buildSourceAfter;
  return {
    passed: outer.passed,
    checks: outer.checks,
    clock: outer.clock,
    settings: describeSettings(config, outer.safetyCheckDirectory),
    installs: config.installs,
    reference,
    summaries,
    paired,
    hostDockerLatency: outer.hostDockerLatency,
    host: outer.host,
    toolVersions,
    source: { before, after, check: before && after ? compareSourceIdentities(before, after) : null },
    load: { before: outer.loadBefore, after: outer.loadAfter },
    artifacts: null
  };
};

/**
 * The lines of `original` a longest common subsequence with `rendered` leaves out (removed) and the lines of
 * `rendered` it leaves out (added), each in order. A line that only moved shows up in both, so a reordering is listed
 * too.
 */
export const lineChanges = (original: string, rendered: string) => {
  const before = original.split('\n');
  const after = rendered.split('\n');
  // common[i][j]: the longest common subsequence of before[i..] and after[j..].
  const common = Array.from({ length: before.length + 1 }, () => Array.from({ length: after.length + 1 }, () => 0));
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      common[i]![j] =
        before[i] === after[j] ? common[i + 1]![j + 1]! + 1 : Math.max(common[i + 1]![j]!, common[i]![j + 1]!);
    }
  }
  const removed: string[] = [];
  const added: string[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      i += 1;
      j += 1;
    } else if (common[i + 1]![j]! >= common[i]![j + 1]!) {
      removed.push(before[i++]!);
    } else {
      added.push(after[j++]!);
    }
  }
  removed.push(...before.slice(i));
  added.push(...after.slice(j));
  return { removed, added };
};

const quote = (line: string) => `>   ${line.length > 0 ? `\`${line.replaceAll('`', "'")}\`` : '(empty line)'}`;

export const rerenderRun = async ({
  runDirectory,
  command,
  reason
}: {
  runDirectory: string;
  command: string;
  /** Why the original report must not be cited, in one sentence. */
  reason: string;
}) => {
  const files = Object.fromEntries(
    await Promise.all(
      INPUTS.map(async (name) => {
        const bytes = await readFile(join(runDirectory, name)).catch(() => {
          throw new Error(`The saved run has no ${name}; nothing is rendered.`);
        });
        let json: unknown;
        try {
          json = JSON.parse(bytes.toString());
        } catch {
          throw new Error(`The saved run's ${name} is not JSON; nothing is rendered.`);
        }
        return [name, { bytes, sha256: sha256(bytes), json }] as const;
      })
    )
  ) as Record<(typeof INPUTS)[number], { bytes: Buffer; sha256: string; json: unknown }>;
  const body = renderReport(
    reportInputFromSavedRun({
      config: files['harness-config.json'].json,
      outer: files['outer.json'].json,
      inner: files['inner-report.json'].json,
      report: files['report.json'].json
    })
  );
  const original = await readFile(join(runDirectory, 'report.md'), 'utf8').catch(() => null);
  const renderers = await Promise.all(
    RENDERER_SOURCES.map(async (name) => `\`${name}\` ${sha256(await readFile(join(import.meta.dir, name)))}`)
  );
  const { removed, added } = original === null ? { removed: [], added: [] } : lineChanges(original, body);
  const run = basename(runDirectory);
  const note = [
    `> **Superseding rendering of \`${run}/report.md\`.** It was rendered again from the run's saved evidence with the`,
    '> current renderer; nothing was measured again. The original report is kept unchanged. Cite this file instead of',
    `> the original. ${reason}`,
    '>',
    `> - Command: \`${command}\``,
    `> - Inputs: ${INPUTS.map((name) => `\`${name}\` ${files[name].sha256}`).join('; ')}.`,
    '> - The summaries and the paired comparison recomputed from the saved samples equal the saved ones.',
    `> - Renderer: ${renderers.join('; ')}.`,
    original === null
      ? '> - The run has no original `report.md`.'
      : `> - Original \`report.md\` SHA-256 ${sha256(original)}. Lines it had that this rendering does not (${removed.length}), then lines this rendering adds (${added.length}):`,
    ...(original === null
      ? []
      : [...removed.map((line) => quote(`- ${line}`)), ...added.map((line) => quote(`+ ${line}`))]),
    '',
    ''
  ];
  return { markdown: `${note.join('\n')}${body}`, body, removed, added };
};

const main = async () => {
  const args = yargsParser(process.argv.slice(2), { string: ['run', 'out', 'reason'] });
  if (!args.run || !args.out || !args.reason) {
    throw new Error(
      'Usage: bun scripts/perf/cli-report-rerender.ts --run <run directory> --out <new file outside it> --reason <why>'
    );
  }
  const runDirectory = resolve(String(args.run));
  const out = resolve(String(args.out));
  if (!relative(runDirectory, out).startsWith('..')) {
    throw new Error('Write the rendering outside the run directory, which stays as the run left it.');
  }
  const { markdown, removed, added } = await rerenderRun({
    runDirectory,
    command: `bun scripts/perf/cli-report-rerender.ts --run ${String(args.run)} --out ${String(args.out)} --reason <the reason below>`,
    reason: String(args.reason)
  });
  // `wx`: never replace an existing file.
  await writeFile(out, markdown, { flag: 'wx' });
  console.info(`Wrote ${out}: ${removed.length} line(s) of the original replaced, ${added.length} line(s) added.`);
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
