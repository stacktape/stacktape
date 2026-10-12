import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { lanes, slices, toolingTests, matchesPath, type Lane, type Slice } from './test-registry.ts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ignoredDirectories = new Set([
  'node_modules',
  '.git',
  'dist',
  '.generated',
  '@generated',
  '.stacktape',
  '.astro'
]);
export const discoverTestFiles = async (root: string): Promise<string[]> => {
  const files: string[] = [];
  const visit = async (directory: string) => {
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      const path = directory ? `${directory}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name) && !entry.name.startsWith('__')) {
          // Visit one directory at a time to bound filesystem work in public and integrated checkouts.
          // eslint-disable-next-line no-await-in-loop
          await visit(path);
        }
      } else if (entry.isFile() && /[._](test|spec)\.[cm]?[jt]sx?$/.test(entry.name)) files.push(path);
    }
  };
  for (const directory of ['apps', 'packages', 'scripts'])
    if (existsSync(resolve(root, directory))) await visit(directory);
  return files.toSorted();
};
type Manifest = { name?: string; scripts?: Record<string, string> };
const readManifest = (path: string): Manifest => JSON.parse(readFileSync(path, 'utf8')) as Manifest;
const manifests = async (root: string): Promise<Map<string, { directory: string; manifest: Manifest }>> => {
  const result = new Map<string, { directory: string; manifest: Manifest }>();
  const visit = async (directory: string, depth: number) => {
    const path = resolve(root, directory, 'package.json');
    if (existsSync(path)) {
      const manifest = readManifest(path);
      if (manifest.name) result.set(manifest.name, { directory, manifest });
    }
    if (!depth || !existsSync(resolve(root, directory))) return;
    for (const entry of await readdir(resolve(root, directory), { withFileTypes: true })) {
      if (entry.isDirectory() && !ignoredDirectories.has(entry.name) && !entry.name.startsWith('__'))
        // eslint-disable-next-line no-await-in-loop
        await visit(`${directory}/${entry.name}`, depth - 1);
    }
  };
  if (existsSync(resolve(root, 'package.json')))
    result.set('root', { directory: '', manifest: readManifest(resolve(root, 'package.json')) });
  await visit('apps', 3);
  await visit('packages', 1);
  return result;
};

export const checkTestRegistry = async ({
  root = workspaceRoot,
  registeredLanes = lanes,
  registeredSlices = slices,
  tooling = toolingTests
}: {
  root?: string;
  registeredLanes?: readonly Lane[];
  registeredSlices?: readonly Slice[];
  tooling?: readonly string[];
} = {}): Promise<string[]> => {
  const errors: string[] = [];
  const consolePresent = existsSync(resolve(root, 'apps/console/api/package.json'));
  const present = (path: string) => consolePresent || !path.startsWith('apps/console/');
  const owners = new Map<string, string>();
  for (const slice of registeredSlices) {
    if (slice.status === 'active' && (!slice.paths.length || !slice.lanes.length))
      errors.push(
        `${slice.id}: add implementation paths and at least one lane ID to slices in scripts/workspace/test-registry.ts.`
      );
    for (const id of slice.lanes)
      if (!registeredLanes.some((lane) => lane.id === id))
        errors.push(
          `${slice.id}: lane ${id} is missing. Add its argv, level, tier, tests and requires to lanes in scripts/workspace/test-registry.ts.`
        );
    for (const id of slice.contributors ?? [])
      if (!registeredSlices.some((candidate) => candidate.id === id && candidate.status === 'active'))
        errors.push(`${slice.id}: contributor ${id} must name an active slice.`);
    for (const path of slice.tests) {
      if (owners.has(path))
        errors.push(
          `${path}: duplicate primary owners ${owners.get(path)} and ${slice.id}. Keep one slice.tests entry and use contributors for shared protection.`
        );
      owners.set(path, slice.id);
    }
  }
  for (const path of tooling) {
    if (owners.has(path))
      errors.push(`${path}: already owned by ${owners.get(path)}. Remove its duplicate toolingTests entry.`);
    owners.set(path, 'tooling');
  }
  const discoveredTests = await discoverTestFiles(root);
  for (const path of discoveredTests)
    if (!owners.has(path))
      errors.push(
        `${path}: no test owner. Add this exact path to the owning slice's tests in scripts/workspace/test-registry.ts, or to toolingTests for a harness/policy test. Use a slice with status 'excluded' for an explicit exclusion.`
      );
  for (const [path, owner] of owners)
    if (present(path) && !existsSync(resolve(root, path)))
      errors.push(`${path}: ${owner} owns a missing file. Remove or update its exact registry path.`);
  const packages = await manifests(root);
  const seenIds = new Set<string>();
  const seenCommands = new Set<string>();
  for (const lane of registeredLanes) {
    const label = `Lane ${lane.id}`;
    if (seenIds.has(lane.id)) errors.push(`${label}: duplicate ID. Give this lane a unique ID.`);
    seenIds.add(lane.id);
    const commandKey = JSON.stringify(lane.command);
    if (seenCommands.has(commandKey))
      errors.push(`${label}: duplicate command. Reference the existing lane ID from the slice instead.`);
    seenCommands.add(commandKey);
    if (lane.tier === 'pr' && lane.requires.some((requirement) => requirement !== 'console'))
      errors.push(
        `${label}: pr lanes must be offline and need no Docker, Chromium, AWS, network or reservation. Move it to change/release.`
      );
    for (const path of lane.tests)
      if (path.startsWith('apps/console/') && !lane.requires.includes('console'))
        errors.push(
          `${label}: private test entrypoint ${path} needs requires: ['console']. For a public lane, replace it with its actual public test entrypoint.`
        );
    if (lane.requires.includes('console') && !consolePresent) continue;
    for (const path of lane.tests)
      if (!existsSync(resolve(root, path)))
        errors.push(`${label}: test entrypoint ${path} is missing. Update lane.tests.`);
    const argv = [...lane.command];
    if (argv.shift() !== 'pnpm') {
      errors.push(`${label}: use pnpm argv for workspace orchestration.`);
      continue;
    }
    let target = packages.get('root');
    if (argv[0] === '--filter') {
      argv.shift();
      const name = argv.shift()!;
      target = packages.get(name);
      if (!target) {
        errors.push(
          `${label}: workspace ${name} does not exist. Fix command --filter or mark requires: ['console'] for private lanes.`
        );
        continue;
      }
    }
    if (argv[0] === 'run') argv.shift();
    const action = argv.shift()!;
    if (action === 'exec') {
      if (argv[0] === 'bun' && argv[1] === 'test')
        for (const path of argv.slice(2).filter((arg) => !arg.startsWith('--')))
          if (!existsSync(resolve(root, target!.directory, path)))
            errors.push(`${label}: Bun test path ${path} is missing. Fix command argv.`);
      continue;
    }
    if (!target?.manifest.scripts?.[action]) {
      errors.push(
        `${label}: script ${action} does not exist in ${target?.directory || 'root'}/package.json. Add that script or fix command argv.`
      );
      continue;
    }
    const script = target.manifest.scripts[action];
    for (const entry of script.matchAll(
      /(?:^|[&\s])(?:bun|node|tsx)(?:\s+--[\w=:-]+)*(?:\s+(?:run|--test))?\s+([^\s&]+\.[cm]?[jt]sx?)(?:\s|$)/g
    )) {
      const entryPath = relative(root, resolve(root, target.directory, entry[1]!)).replaceAll('\\', '/');
      if (!existsSync(resolve(root, entryPath)) && !discoveredTests.some((path) => matchesPath(entryPath, path)))
        errors.push(`${label}: script entrypoint ${entry[1]} is missing. Fix ${action} in package.json.`);
    }
    if (action === 'qualify:projects' || action === 'test:aws') {
      const runnerPath = resolve(root, 'apps/cli/scripts/qualification/run-project-qualification.ts');
      const catalogPath = resolve(root, 'apps/cli/scripts/qualification/catalog.ts');
      if (existsSync(runnerPath)) {
        const runner = readFileSync(runnerPath, 'utf8');
        for (const argument of argv.filter((arg) => arg.startsWith('--') && arg !== '--')) {
          const [flag, value] = argument.slice(2).split('=');
          if (!runner.includes(`'${flag}':`) && !new RegExp(`\\b${flag}:`).test(runner))
            errors.push(
              `${label}: qualification flag --${flag} does not exist. Fix command argv or add it to the qualification parser.`
            );
          if (
            flag === 'aws-scenario' &&
            existsSync(catalogPath) &&
            !readFileSync(catalogPath, 'utf8').includes(`id: '${value}'`)
          )
            errors.push(
              `${label}: AWS scenario ${value} does not exist. Use a named scenario from the qualification catalog.`
            );
        }
      }
    }

    if (action === 'test:db') {
      const runner = readFileSync(resolve(root, target.directory, 'scripts/run-db-integration.ts'), 'utf8');
      for (const flag of argv.filter((arg) => arg.startsWith('--')))
        if (!runner.includes(`'${flag}':`))
          errors.push(
            `${label}: DB flag ${flag} does not exist. Register it in run-db-integration.ts or fix command argv.`
          );
    }
    // Validate projects in the script too: a valid alias must still dispatch to a real Playwright project/config.
    for (const match of script.matchAll(/playwright test\b([^&]*)/g)) {
      const argumentsText = `${match[1]!} ${argv.join(' ')}`;
      const config = argumentsText.match(/--config(?:=|\s+)([^\s]+)/)?.[1] ?? 'playwright.config.ts';
      const configPath = resolve(root, target.directory, config);
      if (!existsSync(configPath)) {
        errors.push(`${label}: Playwright config ${config} is missing. Fix the package script.`);
        continue;
      }
      const sources = new Map<string, string>();
      const readConfig = (path: string) => {
        if (sources.has(path)) return;
        const source = readFileSync(path, 'utf8');
        sources.set(path, source);
        for (const imported of source.matchAll(/from ['"]([.][^'"]+)['"]/g)) {
          const base = resolve(dirname(path), imported[1]!);
          const file = [base, `${base}.ts`].find((candidate) => existsSync(candidate) && candidate.endsWith('.ts'));
          if (file) readConfig(file);
        }
      };
      readConfig(configPath);
      const group = readFileSync(configPath, 'utf8').match(/createConsoleBrowserConfig\([^;]*?,\s*(\w+)\)/)?.[1];
      const projectSources = group
        ? [...sources.values()]
            .flatMap((source) => source.match(new RegExp(`const ${group} = \\[([^\\]]*)\\]`))?.[1] ?? [])
            .join('\n')
        : [...sources.values()].join('\n');
      for (const project of argumentsText.matchAll(/--project(?:=|\s+)([^\s]+)/g))
        if (
          !(group
            ? projectSources.includes(`'${project[1]}'`)
            : new RegExp(`name:\\s*['"]${project[1]}['"]`).test(projectSources))
        )
          errors.push(
            `${label}: Playwright project ${project[1]} is absent from ${config} and its imports. Add that project or fix the package script.`
          );
    }
  }
  return errors;
};
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = await checkTestRegistry();
  for (const error of errors) console.error(error);
  if (errors.length) process.exitCode = 1;
  else
    console.info(
      `Test registry checked: ${slices.filter((slice) => slice.status === 'active').length} active slices, ${lanes.length} lanes; every test has an explicit owner.`
    );
}
