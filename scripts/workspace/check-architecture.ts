import { createRequire } from 'node:module';
import { readdirSync } from 'node:fs';
import { dirname, resolve, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cruise, type IConfiguration, type ICruiseResult, type IViolation } from 'dependency-cruiser';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const ignoredDirectories = new Set([
  'node_modules',
  'dist',
  '@generated',
  'generated',
  '.generated',
  '.astro',
  '.stacktape',
  'starter-projects',
  '_test-stacks',
  'fixtures',
  'public'
]);
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts', '.astro']);
const sourceFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) return [];
    const entryPath = resolve(directory, entry.name);
    if (entry.isDirectory())
      return ignoredDirectories.has(entry.name) || entry.name.startsWith('__') ? [] : sourceFiles(entryPath);
    return sourceExtensions.has(extname(entry.name)) ? [relative(process.cwd(), entryPath).replaceAll('\\', '/')] : [];
  });

export const getWorkspaceAliases = (directory: string): Record<string, string> => {
  const configPath = resolve(directory, 'tsconfig.json');
  if (!ts.sys.fileExists(configPath)) return {};
  const result = ts.readConfigFile(configPath, ts.sys.readFile);
  if (result.error) throw new Error(ts.flattenDiagnosticMessageText(result.error.messageText, '\n'));
  const parsed = ts.parseJsonConfigFileContent(result.config, ts.sys, directory);
  const paths = parsed.options.paths ?? {};
  // TypeScript records where inherited paths were declared, even when there is no baseUrl.
  const pathsDirectory =
    parsed.options.baseUrl ??
    (typeof parsed.options.pathsBasePath === 'string' ? parsed.options.pathsBasePath : directory);
  return Object.fromEntries(
    Object.entries(paths).map(([name, targets]) => {
      if (targets.length !== 1 || !targets[0])
        throw new Error(`${configPath}: architecture imports require one target per alias (${name}).`);
      return [name.replace(/\/\*$/, ''), resolve(pathsDirectory, targets[0].replace(/\/\*$/, ''))];
    })
  );
};

export const checkWorkspaceArchitecture = async ({
  directory,
  configuration
}: {
  directory: string;
  configuration: IConfiguration;
}): Promise<IViolation[]> => {
  const inputs = sourceFiles(directory);
  if (!inputs.length) return [];
  const violations: IViolation[] = [];
  for (const types of [false, true]) {
    const forbidden = types
      ? configuration.forbidden?.filter((rule) => rule.name !== 'no-cycles' && !rule.name?.includes('runtime'))
      : configuration.forbidden;
    // The cruiser shares resolver caches between calls; finish each pass before invalidating them.
    // eslint-disable-next-line no-await-in-loop
    const result = await cruise(
      inputs,
      {
        ...configuration.options,
        tsPreCompilationDeps: types ? 'specify' : false,
        validate: true,
        outputType: 'json',
        ruleSet: { forbidden: forbidden ?? [] }
      },
      { alias: getWorkspaceAliases(directory), bustTheCache: true }
    );
    const graph = (typeof result.output === 'string' ? JSON.parse(result.output) : result.output) as ICruiseResult;
    violations.push(...graph.summary.violations);
  }
  return violations;
};

const main = async () => {
  process.chdir(workspaceRoot);
  const configuration = require(resolve(workspaceRoot, 'dependency-cruiser.config.cjs')) as IConfiguration;
  const workspaces = ['apps', 'packages'].flatMap((parent) =>
    readdirSync(parent, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .flatMap((entry) => {
        const directory = resolve(parent, entry.name);
        if (entry.name === 'console')
          return readdirSync(directory, { withFileTypes: true })
            .filter((child) => child.isDirectory() && ts.sys.fileExists(resolve(directory, child.name, 'package.json')))
            .map((child) => resolve(directory, child.name));
        return ts.sys.fileExists(resolve(directory, 'package.json')) ? [directory] : [];
      })
  );
  const violations: IViolation[] = [];
  for (const directory of workspaces) {
    // Each workspace uses different aliases and the cruiser shares its resolver caches.
    // eslint-disable-next-line no-await-in-loop
    violations.push(...(await checkWorkspaceArchitecture({ directory, configuration })));
  }
  const unique = new Map(
    violations.map((violation) => [
      JSON.stringify([violation.rule.name, violation.from, violation.to, violation.cycle]),
      violation
    ])
  );
  for (const violation of unique.values()) {
    console.error(`${violation.rule.name}: ${violation.from} → ${violation.to}`);
    if (violation.cycle) console.error(`  ${violation.cycle.map(({ name }) => name).join(' → ')}`);
  }
  if (unique.size) process.exitCode = 1;
  else console.info(`Architecture checks passed for ${workspaces.length} workspaces, including declaration imports.`);
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
