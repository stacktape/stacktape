/**
 * Records which AWS resources each kind of Stacktape resource becomes, for the wizard fixture's deploy.
 *
 * The fixture replays a deploy's CloudFormation progress resource by resource, so it needs the logical IDs and types a
 * real template has. This synthesizes the configuration the wizard composes for every recorded project, offline (no
 * AWS, no Stacktape account; `$Secret` references become plain values), and writes `stack-resources.json`: per
 * Stacktape resource type, its logical IDs with `{Name}` for the resource's own name (and `{Port}` for a container
 * port), and the stack's shared resources, with the ones only some resource types bring keyed by that type. Rerun after a change to what a resource synthesizes:
 *
 *   bun --preload ./scripts/test-preload.ts scripts/init-wizard-fixture/record-stack-resources.ts
 */

import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { composeConfig } from '@stacktape/config-inference/compose';
import { projectFactsSchema } from '@stacktape/config-inference/facts';
import versionJson from '@generated/db-engine-versions/versions.json';
import { stringifyToYaml } from '@utils/yaml';
import { synthesizeFixture } from '../../tests/characterization/synthesis-fixture';

type Entry = [logicalId: string, type: string];

const pascal = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

const main = async () => {
  const projectsDirectory = join(import.meta.dir, 'projects');
  const projects = (await readdir(projectsDirectory))
    .filter((file) => file.endsWith('.files.json'))
    .map((file) => file.slice(0, -'.files.json'.length));

  /** Per resource type, each logical ID pattern with its type and how many projects' stacks had it. */
  const byType = new Map<string, Map<string, { type: string; projects: number }>>();
  const typeProjects = new Map<string, number>();
  /** Each shared logical ID with the resource types of every project whose stack had it. */
  const shared = new Map<string, { type: string; projectTypes: Array<Set<string>> }>();
  const projectTypes: Array<Set<string>> = [];

  for (const project of projects) {
    const facts = projectFactsSchema.parse(
      JSON.parse(readFileSync(join(projectsDirectory, `${project}.json`), 'utf8'))
    );
    const { config } = composeConfig({
      facts,
      projectName: project,
      engineVersions: (versionJson as { rds: never }).rds
    });
    const resources = Object.entries(config.resources) as Array<[string, { type: string }]>;
    if (resources.length === 0) continue;

    // The recorded repository, so packaging finds the files the configuration points at.
    const directory = await mkdtemp(join(tmpdir(), `stacktape-stack-resources-${project}-`));
    const recorded = JSON.parse(readFileSync(join(projectsDirectory, `${project}.files.json`), 'utf8')) as {
      files: Record<string, string[]>;
      localValues?: Record<string, string[]>;
      tree?: string[];
    };
    for (const path of recorded.tree ?? []) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), '');
    }
    for (const [path, lines] of Object.entries({ ...recorded.files, ...recorded.localValues })) {
      await mkdir(dirname(join(directory, path)), { recursive: true });
      await writeFile(join(directory, path), lines.join('\n'));
    }
    // Secrets would be read from AWS; their values do not change which resources exist.
    const yaml = stringifyToYaml(config).replace(/\$Secret\('([^']+)'\)/g, 'recorded-$1');
    await writeFile(join(directory, 'stacktape.yml'), yaml);

    const template = await synthesizeFixture({
      configPath: join(directory, 'stacktape.yml'),
      workingDir: directory,
      identity: { projectName: project, stage: 'dev', region: 'eu-west-1', accountId: '481516234200' }
    });
    await rm(directory, { recursive: true, force: true });

    const types = new Set(resources.map(([, resource]) => resource.type));
    projectTypes.push(types);
    const seenPatterns = new Set<string>();
    // Longest names first, so `apiGateway` is not taken for `api`.
    const names = resources.map(([name]) => name).toSorted((left, right) => right.length - left.length);
    for (const [logicalId, resource] of Object.entries(template.Resources ?? {}) as Array<[string, { Type: string }]>) {
      const owner =
        names.find((name) => logicalId.startsWith(pascal(name))) ??
        names.find((name) => logicalId.includes(pascal(name)));
      if (owner === undefined) {
        const entry = shared.get(logicalId) ?? { type: resource.Type, projectTypes: [] };
        entry.projectTypes.push(types);
        shared.set(logicalId, entry);
        continue;
      }
      const type = resources.find(([name]) => name === owner)![1].type;
      // The resource's name and its container port vary from project to project; the rest is the type's own.
      const pattern = logicalId.replaceAll(pascal(owner), '{Name}').replace(/Port\d+/g, 'Port{Port}');
      const key = `${type} ${pattern}`;
      if (seenPatterns.has(key)) continue;
      seenPatterns.add(key);
      const entries = byType.get(type) ?? new Map<string, { type: string; projects: number }>();
      const entry = entries.get(pattern) ?? { type: resource.Type, projects: 0 };
      entry.projects += 1;
      entries.set(pattern, entry);
      byType.set(type, entries);
    }
    for (const type of types) typeProjects.set(type, (typeProjects.get(type) ?? 0) + 1);
  }

  // Shared by every stack, or brought by the resource types that every stack having it had.
  const sharedEverywhere: Entry[] = [];
  const sharedFor = new Map<string, Entry[]>();
  for (const [logicalId, { type, projectTypes: seenWith }] of shared) {
    if (seenWith.length === projectTypes.length) {
      sharedEverywhere.push([logicalId, type]);
      continue;
    }
    const common = [...seenWith[0]!].filter((candidate) => seenWith.every((types) => types.has(candidate)));
    // The type the stacks without this resource lacked.
    const bringer =
      common.find((candidate) => projectTypes.every((types) => !types.has(candidate) || seenWith.includes(types))) ??
      common[0];
    if (bringer === undefined) continue;
    sharedFor.set(bringer, [...(sharedFor.get(bringer) ?? []), [logicalId, type]]);
  }

  const output = {
    shared: sharedEverywhere,
    sharedFor: Object.fromEntries([...sharedFor].toSorted(([left], [right]) => left.localeCompare(right))),
    types: Object.fromEntries(
      [...byType]
        .toSorted(([left], [right]) => left.localeCompare(right))
        // What every stack with this type had: a release command or a mounted volume is one project's choice.
        .map(([type, entries]) => [
          type,
          [...entries]
            .filter(([, entry]) => entry.projects === typeProjects.get(type))
            .map(([pattern, entry]) => [pattern, entry.type])
        ])
    )
  };
  const target = join(import.meta.dir, 'stack-resources.json');
  await writeFile(target, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${target}`);
  process.exit(0);
};

void main();
