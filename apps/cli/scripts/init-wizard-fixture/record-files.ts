/**
 * Records the repository files the wizard fixture shows while it replays a scan.
 *
 * The fixture replays recorded facts into an empty folder, so without this its code window would have nothing to
 * show. This copies, from a checkout of the recorded repository, exactly the files the page can ask for: the ones the
 * scripted scan timeline below reads, and every file the recorded facts cite as evidence. The evidence line numbers
 * must land on the cited lines, so record from the same commit the facts were recorded from (`source` below):
 *
 *   bun scripts/init-wizard-fixture/record-files.ts <name> <repository-directory>
 *
 * Writes `projects/<name>.files.json`: the source, the scan timeline, each file as its lines, and the repository's
 * tree (`tree`: every file name the wizard's tree route lists for that checkout, see `repository-tree.ts`; names only).
 * The files are stored already masked the way the page shows them (`.env` values and URL credentials as `••••`, see
 * `file-view.ts`), so no example password is committed. The fixture writes them into its temporary repository at
 * start, and an empty file for every other name in the tree, so the page draws the real project.
 */

import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { maskEnvironmentText, maskUrlCredentials } from '../../src/init/server/file-view';
import { readRepositoryTree } from '../../src/init/server/repository-tree';

/**
 * Where each recording comes from, and the order a coding agent plausibly reads it in. The timeline entries are the
 * labels the real session gives an agent's tool calls (`toTimelineEntry`): the tool, then its path or pattern.
 */
const PROJECTS: Readonly<
  Record<string, { source: string; timeline: ReadonlyArray<readonly [tool: string, subject: string]> }>
> = {
  'saas-starter': {
    source: 'https://github.com/nextjs/saas-starter at 6e33e58',
    timeline: [
      ['get_project_brief', 'get_project_brief'],
      ['read_file', 'package.json'],
      ['read_file', '.env.example'],
      ['list_dir', 'lib'],
      ['read_file', 'lib/db/drizzle.ts'],
      ['read_file', 'drizzle.config.ts'],
      ['grep', 'process.env'],
      ['read_file', 'lib/auth/session.ts'],
      ['read_file', 'lib/payments/stripe.ts'],
      ['read_file', 'app/api/stripe/webhook/route.ts'],
      ['read_file', 'next.config.ts'],
      ['submit_facts', 'submit_facts']
    ]
  },
  'full-stack-fastapi': {
    source: 'https://github.com/fastapi/full-stack-fastapi-template at 588dfd4',
    timeline: [
      ['get_project_brief', 'get_project_brief'],
      ['read_file', 'compose.yml'],
      ['read_file', '.env'],
      ['list_dir', 'backend'],
      ['read_file', 'backend/Dockerfile'],
      ['read_file', 'backend/pyproject.toml'],
      ['read_file', 'backend/app/main.py'],
      ['read_file', 'backend/app/core/config.py'],
      ['read_file', 'backend/scripts/prestart.sh'],
      ['list_dir', 'frontend'],
      ['read_file', 'frontend/package.json'],
      ['read_file', 'frontend/src/main.tsx'],
      ['submit_facts', 'submit_facts']
    ]
  },
  'go-clean-template': {
    source: 'https://github.com/evrone/go-clean-template at 376bcd4',
    timeline: [
      ['get_project_brief', 'get_project_brief'],
      ['read_file', 'go.mod'],
      ['read_file', 'docker-compose.yml'],
      ['read_file', '.env.example'],
      ['read_file', 'cmd/app/main.go'],
      ['read_file', 'config/config.go'],
      ['grep', 'os.Getenv'],
      ['read_file', 'internal/app/app.go'],
      ['read_file', 'Dockerfile'],
      ['submit_facts', 'submit_facts']
    ]
  },
  'epic-stack': {
    source: 'https://github.com/epicweb-dev/epic-stack at 8473afd',
    timeline: [
      ['get_project_brief', 'get_project_brief'],
      ['read_file', 'package.json'],
      ['read_file', 'fly.toml'],
      ['read_file', 'other/Dockerfile'],
      ['read_file', 'prisma/schema.prisma'],
      ['read_file', '.env.example'],
      ['read_file', 'server/index.ts'],
      ['grep', 'process.env'],
      ['read_file', 'app/utils/storage.server.ts'],
      ['read_file', 'app/utils/env.server.ts'],
      ['read_file', 'app/utils/cache.server.ts'],
      ['submit_facts', 'submit_facts']
    ]
  }
};

/** Every `{ file, line }` citation in the recorded facts. */
const evidenceFiles = (facts: unknown): Set<string> => {
  const files = new Set<string>();
  const visit = (value: unknown) => {
    if (value === null || typeof value !== 'object') return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    const record = value as Record<string, unknown>;
    if (typeof record.file === 'string' && typeof record.line === 'number') files.add(record.file);
    for (const child of Object.values(record)) visit(child);
  };
  visit(facts);
  return files;
};

const main = async () => {
  const [name, repositoryRoot] = process.argv.slice(2);
  const project = name === undefined ? undefined : PROJECTS[name];
  if (name === undefined || repositoryRoot === undefined || project === undefined) {
    throw new Error(`Usage: record-files.ts <${Object.keys(PROJECTS).join('|')}> <repository-directory>`);
  }

  const facts = JSON.parse(readFileSync(join(import.meta.dir, 'projects', `${name}.json`), 'utf8')) as unknown;
  const timeline = project.timeline.map(([tool, subject]) => ({ kind: 'tool', label: `${tool} ${subject}` }));
  const paths = new Set([
    ...project.timeline.filter(([tool]) => tool === 'read_file').map(([, subject]) => subject),
    ...evidenceFiles(facts)
  ]);
  const files: Record<string, string[]> = {};
  for (const path of [...paths].sort()) {
    const text = await readFile(join(repositoryRoot, path), 'utf8');
    files[path] = maskUrlCredentials(/^\.env($|\.)/i.test(basename(path)) ? maskEnvironmentText(text) : text).split(
      '\n'
    );
  }

  const tree = await readRepositoryTree({ repositoryRoot });
  if (tree.truncated) throw new Error(`${repositoryRoot} has more files than the tree route lists.`);

  const target = join(import.meta.dir, 'projects', `${name}.files.json`);
  // `localValues` is recorded by hand (a template's public `.env` values for the Deploy step's import); a new
  // recording keeps it.
  const previous = (() => {
    try {
      return JSON.parse(readFileSync(target, 'utf8')) as { localValues?: Record<string, string[]> };
    } catch {
      return {};
    }
  })();
  await writeFile(
    target,
    `${JSON.stringify({ source: project.source, timeline, files, tree: tree.files, ...(previous.localValues === undefined ? {} : { localValues: previous.localValues }) }, null, 2)}\n`
  );
  console.log(`Wrote ${target}: ${paths.size} files, a tree of ${tree.files.length}`);
};

void main();
