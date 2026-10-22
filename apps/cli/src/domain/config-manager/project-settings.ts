/**
 * Project settings (`projectName`, `region`) read from a Stacktape config without running it.
 *
 * The CLI needs the region and project before it evaluates a config: argument validation, credential selection and
 * the AWS clients use them, and evaluating a TypeScript config runs project code. So the settings are read statically:
 * string literals in the first argument of the default-exported `defineConfig({ projectName, region }, fn)` call, or
 * top-level keys of a YAML/JSON config. Anything else is an error that shows the supported form. The CLI and the MCP
 * planner both use this module; it never imports or executes project code.
 */
import { lstatSync, readdirSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, extname, isAbsolute, join, relative, resolve } from 'node:path';
import { SUPPORTED_AWS_REGIONS } from '@stacktape/config/aws-regions';
import { VALID_CONFIG_PATHS } from '@config';
import { CliError } from '@utils/errors';
import { parseYaml } from '@utils/yaml';
import type { StacktapeCommand } from '../../config/cli/commands';
import { getAllowedArgs } from '../../config/cli/utils';

export type ProjectSettingName = 'projectName' | 'region';
export type ProjectSettings = Readonly<Partial<Record<ProjectSettingName, string>>>;

const SETTING_NAMES: readonly ProjectSettingName[] = ['projectName', 'region'];
const TYPESCRIPT_FORM =
  "export default defineConfig({ projectName: 'my-app', region: 'eu-west-1' }, ({ stage }) => ({ resources: { ... } }));";
const YAML_FORM = 'projectName: my-app\nregion: eu-west-1';

// ---------------------------------------------------------------------------------------------------------------------
// Which commands take settings from the config
// ---------------------------------------------------------------------------------------------------------------------

/** Commands that never read project settings, even where they accept the arguments. */
const COMMANDS_WITHOUT_PROJECT_SETTINGS = new Set<string>([
  'help',
  'version',
  'login',
  'logout',
  'upgrade',
  'init',
  'mcp',
  'mcp:add',
  'mcp:remove',
  'dev:stop'
]);

/** Account-wide lists use `projectName` as a filter. A filter stays explicit; only the region comes from the config. */
const COMMANDS_FILTERING_BY_PROJECT = new Set<string>(['incidents', 'errors:list', 'info:operations', 'info:stacks']);

/** The settings a command takes from the project config: only arguments it accepts, and never for excluded commands. */
export const projectSettingsForCommand = (command: StacktapeCommand): readonly ProjectSettingName[] => {
  if (COMMANDS_WITHOUT_PROJECT_SETTINGS.has(command)) return [];
  const allowed = getAllowedArgs(command);
  return SETTING_NAMES.filter(
    (name) => allowed.includes(name) && !(name === 'projectName' && COMMANDS_FILTERING_BY_PROJECT.has(command))
  );
};

/**
 * Whether an unreadable settings block stops the command. Commands that load the config (they accept `--config`) fail
 * on it anyway, so they fail early with the precise message. Every other command continues without settings: a broken
 * config must never block a command that does not use it.
 */
export const projectSettingsErrorsAreFatal = (command: StacktapeCommand): boolean =>
  getAllowedArgs(command).includes('configPath');

// ---------------------------------------------------------------------------------------------------------------------
// Locating the config file
// ---------------------------------------------------------------------------------------------------------------------

export const CONFIG_FILE_PRECEDENCE = [
  'stacktape.ts',
  'stacktape.yml',
  ...VALID_CONFIG_PATHS.filter((configPath) => !['stacktape.ts', 'stacktape.yml'].includes(configPath))
];

const configFilePriority = (filePath: string) => {
  const priority = CONFIG_FILE_PRECEDENCE.indexOf(basename(filePath));
  return priority === -1 ? Number.MAX_SAFE_INTEGER : priority;
};

/**
 * The config file a command uses: `--config` resolved against `--cwd` (or the process directory), otherwise the
 * highest-precedence `stacktape.*` file in that directory. `candidates` lists every discovered file, best first.
 */
export const locateConfigFile = ({
  configPath,
  currentWorkingDirectory,
  cwd = process.cwd()
}: {
  configPath?: string;
  currentWorkingDirectory?: string;
  cwd?: string;
}): { path?: string; candidates: string[]; explicit: boolean } => {
  const directory = resolve(cwd, currentWorkingDirectory || '.');
  if (configPath) {
    const path = isAbsolute(configPath) ? configPath : join(directory, configPath);
    return { path, candidates: [path], explicit: true };
  }
  const candidates = readdirSync(directory)
    .map((item) => join(directory, item))
    .filter((item) => VALID_CONFIG_PATHS.includes(basename(item)) && lstatSync(item).isFile())
    .toSorted((first, second) => configFilePriority(first) - configFilePriority(second));
  return { path: candidates[0], candidates, explicit: false };
};

// ---------------------------------------------------------------------------------------------------------------------
// Reading settings
// ---------------------------------------------------------------------------------------------------------------------

const displayPath = (filePath: string) => {
  const relativePath = relative(process.cwd(), filePath).replaceAll('\\', '/');
  return !relativePath || relativePath.startsWith('..') || isAbsolute(relativePath)
    ? basename(filePath)
    : `./${relativePath}`;
};

const settingsError = ({ filePath, problem, form }: { filePath: string; problem: string; form: string }) =>
  new CliError({
    category: 'CONFIG_VALIDATION',
    code: 'CONFIG_PROJECT_SETTINGS_INVALID',
    message: `Cannot read the project settings in \`${displayPath(filePath)}\`: ${problem}`,
    hints: [
      `Stacktape reads \`projectName\` and \`region\` before it runs the config, so they must be plain strings: ${form}`,
      'Use `--project` and `--region` to choose a different target for one command.'
    ]
  });

const validateSettingValue = ({
  name,
  value,
  filePath,
  form
}: {
  name: ProjectSettingName;
  value: string;
  filePath: string;
  form: string;
}) => {
  if (name === 'projectName' && !/^[a-z0-9-]+$/.test(value)) {
    throw settingsError({
      filePath,
      form,
      problem: `\`projectName\` must contain only lowercase letters, numbers and dashes. Received \`${value}\`.`
    });
  }
  if (name === 'region' && !(SUPPORTED_AWS_REGIONS as readonly string[]).includes(value)) {
    throw settingsError({
      filePath,
      form,
      problem: `\`region\` must be a supported AWS region such as \`eu-west-1\`. Received \`${value}\`.`
    });
  }
};

/** Settings of a plain config object: a YAML or JSON config, or a config passed to the programmatic API. */
export const projectSettingsFromConfigObject = (config: unknown, filePath: string): ProjectSettings => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return {};
  const settings: Partial<Record<ProjectSettingName, string>> = {};
  for (const name of SETTING_NAMES) {
    const value = (config as Record<string, unknown>)[name];
    if (value === undefined || value === null) continue;
    if (typeof value !== 'string') {
      throw settingsError({ filePath, form: YAML_FORM, problem: `\`${name}\` must be a string.` });
    }
    validateSettingValue({ name, value, filePath, form: YAML_FORM });
    settings[name] = value;
  }
  return Object.freeze(settings);
};

type Ts = typeof import('typescript');
type Node = import('typescript').Node;
type Expression = import('typescript').Expression;
type SourceFile = import('typescript').SourceFile;

const unwrap = (ts: Ts, expression: Expression): Expression => {
  let current = expression;
  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
};

/** The default-exported expression, or the local name exported by `export { config as default }`. */
const findDefaultExport = (ts: Ts, sourceFile: SourceFile): Expression | string | undefined => {
  for (const statement of sourceFile.statements) {
    if (ts.isExportAssignment(statement)) return statement.expression;
    if (
      ts.isExportDeclaration(statement) &&
      !statement.moduleSpecifier &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      const specifier = statement.exportClause.elements.find((element) => element.name.text === 'default');
      if (specifier) return (specifier.propertyName ?? specifier.name).text;
    }
    // CommonJS `module.exports = ...` in a stacktape.js config.
    if (
      ts.isExpressionStatement(statement) &&
      ts.isBinaryExpression(statement.expression) &&
      statement.expression.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      statement.expression.left.getText(sourceFile) === 'module.exports'
    ) {
      return statement.expression.right;
    }
  }
  return undefined;
};

/** Every `defineConfig(settings, fn)` call in the file, wherever it is written. */
const findSettingsCalls = (ts: Ts, sourceFile: SourceFile, names: Set<string>) => {
  const calls: import('typescript').CallExpression[] = [];
  const visit = (node: Node) => {
    if (ts.isCallExpression(node) && node.arguments.length >= 2 && isDefineConfigCallee(ts, node.expression, names)) {
      calls.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return calls;
};

const findTopLevelConst = (ts: Ts, sourceFile: SourceFile, name: string): Expression | undefined => {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.name.text === name) return declaration.initializer;
    }
  }
  return undefined;
};

/** Local names bound to `defineConfig` by `import { defineConfig as x } from 'stacktape'`, plus the plain name. */
const defineConfigNames = (ts: Ts, sourceFile: SourceFile): Set<string> => {
  const names = new Set(['defineConfig']);
  for (const statement of sourceFile.statements) {
    const bindings = ts.isImportDeclaration(statement) ? statement.importClause?.namedBindings : undefined;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const element of bindings.elements) {
      if ((element.propertyName ?? element.name).text === 'defineConfig') names.add(element.name.text);
    }
  }
  return names;
};

const isDefineConfigCallee = (ts: Ts, callee: Expression, names: Set<string>) =>
  (ts.isIdentifier(callee) && names.has(callee.text)) ||
  (ts.isPropertyAccessExpression(callee) && callee.name.text === 'defineConfig');

const propertyName = (ts: Ts, node: Node): string | undefined =>
  ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) ? node.text : undefined;

/** Settings of a TypeScript or JavaScript config source. Pure: parses the text, never runs it. */
export const projectSettingsFromSource = async ({
  source,
  filePath
}: {
  source: string;
  filePath: string;
}): Promise<ProjectSettings> => {
  // Most configs use `defineConfig(() => ...)` or `defineConfig(({ stage }) => ...)`. Those cannot declare settings, so
  // the TypeScript parser, a large module, loads only for a call whose first argument may be a settings object.
  const mayDeclareSettings =
    /defineConfig\s*(?:<[^>]*>\s*)?\(\s*(?!\(|async\b|function\b|\)|[A-Za-z_$][\w$]*\s*=>)/.test(source) ||
    /\bdefineConfig\s+as\s/.test(source);
  if (!mayDeclareSettings) return {};
  const ts = (await import('typescript')).default as Ts;
  const extension = extname(filePath).toLowerCase();
  const sourceFile = ts.createSourceFile(
    filePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ['.js', '.mjs', '.cjs'].includes(extension) ? ts.ScriptKind.JS : ts.ScriptKind.TS
  );
  const fail = (problem: string) => settingsError({ filePath, problem, form: TYPESCRIPT_FORM });

  const names = defineConfigNames(ts, sourceFile);
  const defaultExport = findDefaultExport(ts, sourceFile);
  let exported = typeof defaultExport === 'string' ? findTopLevelConst(ts, sourceFile, defaultExport) : defaultExport;
  if (exported && ts.isIdentifier(unwrap(ts, exported))) {
    exported = findTopLevelConst(ts, sourceFile, (unwrap(ts, exported) as import('typescript').Identifier).text);
  }
  const unwrapped = exported && unwrap(ts, exported);
  const call =
    unwrapped && ts.isCallExpression(unwrapped) && isDefineConfigCallee(ts, unwrapped.expression, names)
      ? unwrapped
      : undefined;
  // A settings call the reader cannot tie to the default export would otherwise be ignored here and only noticed after
  // credentials were resolved and the config ran, or reported as a missing region.
  if (findSettingsCalls(ts, sourceFile, names).some((settingsCall) => settingsCall !== call)) {
    throw fail(
      'Stacktape could not find the `defineConfig(settings, fn)` call as the default export. Export the call directly or through a top-level `const`.'
    );
  }
  // No settings call to read. Evaluation checks that the loaded config declares no settings.
  if (!call || call.arguments.length < 2) return {};
  if (call.arguments.length > 2) {
    throw fail('`defineConfig` takes the settings object and the config function, nothing else.');
  }
  const settingsArgument = unwrap(ts, call.arguments[0]);
  if (!ts.isObjectLiteralExpression(settingsArgument)) {
    throw fail('the first argument of `defineConfig` must be an object literal written in the config file.');
  }
  const settings: Partial<Record<ProjectSettingName, string>> = {};
  for (const property of settingsArgument.properties) {
    const name = property.name ? propertyName(ts, property.name) : undefined;
    if (!ts.isPropertyAssignment(property) || name === undefined) {
      throw fail(
        `\`${property.getText(sourceFile)}\` is not supported in the settings object. Write each setting as \`name: 'value'\`.`
      );
    }
    if (name !== 'projectName' && name !== 'region') {
      throw fail(`the settings object accepts only \`projectName\` and \`region\`, not \`${name}\`.`);
    }
    if (settings[name] !== undefined) throw fail(`\`${name}\` is declared twice.`);
    const value = unwrap(ts, property.initializer);
    if (!ts.isStringLiteral(value) && !ts.isNoSubstitutionTemplateLiteral(value)) {
      throw fail(
        `\`${name}\` must be a string literal. Received \`${property.initializer.getText(sourceFile)}\`, which is computed when the config runs.`
      );
    }
    validateSettingValue({ name, value: value.text, filePath, form: TYPESCRIPT_FORM });
    settings[name] = value.text;
  }
  return Object.freeze(settings);
};

const SCRIPT_EXTENSIONS = new Set(['.ts', '.mts', '.cts', '.js', '.mjs', '.cjs']);

/**
 * Settings of a config file, or undefined for a format that cannot declare them statically (for example a Python
 * config). Malformed settings throw `CONFIG_PROJECT_SETTINGS_INVALID`; a malformed YAML or JSON document throws too.
 */
export const readProjectSettingsFile = async (filePath: string): Promise<ProjectSettings | undefined> => {
  const extension = extname(filePath).toLowerCase();
  if (SCRIPT_EXTENSIONS.has(extension)) {
    return projectSettingsFromSource({ source: await readFile(filePath, 'utf8'), filePath });
  }
  if (extension === '.yml' || extension === '.yaml' || extension === '.json') {
    const text = await readFile(filePath, 'utf8');
    let document: unknown;
    try {
      document = extension === '.json' ? JSON.parse(text) : parseYaml(text);
    } catch (error) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_FILE_MALFORMED',
        message: `Malformed configuration file at \`${displayPath(filePath)}\`.\n${String(error)}`,
        cause: error
      });
    }
    return projectSettingsFromConfigObject(document, filePath);
  }
  return undefined;
};

/**
 * The settings `command` takes from the config it would use, read without running it. For the MCP planner, which
 * plans a command for a directory: `configPath` and `currentWorkingDirectory` resolve the way the CLI resolves them.
 * An unreadable config is returned as `error` only for commands it would stop.
 */
export const readCommandProjectSettings = async ({
  command,
  cwd,
  configPath,
  currentWorkingDirectory
}: {
  command: StacktapeCommand;
  cwd: string;
  configPath?: string;
  currentWorkingDirectory?: string;
}): Promise<{ configPath?: string; settings: ProjectSettings; error?: CliError }> => {
  const applied = projectSettingsForCommand(command);
  if (!applied.length) return { settings: {} };
  try {
    const { path } = locateConfigFile({ configPath, currentWorkingDirectory, cwd });
    if (!path) return { settings: {} };
    const settings = (await readProjectSettingsFile(path)) ?? {};
    return {
      configPath: path,
      settings: Object.freeze(
        Object.fromEntries(applied.flatMap((name) => (settings[name] ? [[name, settings[name]]] : [])))
      )
    };
  } catch (error) {
    if (projectSettingsErrorsAreFatal(command) && error instanceof CliError) return { settings: {}, error };
    return { settings: {} };
  }
};
