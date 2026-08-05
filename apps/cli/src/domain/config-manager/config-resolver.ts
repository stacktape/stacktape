import type { CustomDirective, Directive } from '@domain-services/config-manager/directive-types';
import {
  isCompiledStacktapeConfig,
  type CompiledStacktapeConfig,
  type FinalTransform,
  type GetConfigParams,
  type ResourceTransform
} from '@stacktape/config-authoring/tooling';
import type { DirectiveParam } from '@utils/directives';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomUUID } from 'node:crypto';
import { open, rm, type FileHandle } from 'node:fs/promises';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { localStatePaths } from 'src/config/local-state-paths';
import { supportedCodeConfigLanguages } from '@config';
import { getFileExtension } from '@utils/fs-utils';
import { isNonNullObject, processAllNodes, serialize, traverseToMaximalExtent } from '@utils/misc';
import { parseYaml } from '@utils/yaml';
import { Stack } from '@utils/collections';
import {
  getDirectiveName,
  getDirectiveParams,
  getDirectivePathToProp,
  getDirectiveWithoutPath,
  getIsDirective
} from '@utils/directives';
import { CliError, getUserCodeStackTrace } from '@utils/errors';
import { loadFromAnySupportedFile, loadFromTypescript, parseUserCodeFilepath } from '@utils/file-loaders';
import { getUserCodeAsFn } from '@utils/user-code-processing';
import { validatePrimitiveFunctionParams } from '@utils/validation-utils';
import { createBuiltInDirectives, type BuiltInDirectiveContext } from './built-in-directives';
import type { StacktapeConfig } from '@stacktape/config';
import { configErrors } from './errors';

type BuildError = {
  message: string;
  position?: {
    file: string;
    line: number;
    column: number;
    lineText: string;
  };
};

/**
 * Format build errors from AggregateError into a readable string
 */
const formatBuildErrors = (errors: BuildError[]): string => {
  return errors
    .map((e) => {
      if (e.position) {
        return `${e.position.file}:${e.position.line}:${e.position.column} - ${e.message}\n  ${e.position.lineText}`;
      }
      return e.message;
    })
    .join('\n\n');
};

/**
 * Parse TypeScript config loading errors and throw appropriate user-friendly errors
 */
const handleTypescriptConfigError = (error: Error, configPath: string): never => {
  const rawMessage = error.message || String(error);

  if ('errors' in error) {
    const aggregateError = error as Error & { errors: BuildError[] };
    if (aggregateError.errors?.length) {
      const formattedErrors = formatBuildErrors(aggregateError.errors);
      throw configErrors.typescriptSyntaxInvalid({ configPath, errorMessage: formattedErrors });
    }
  }

  // Check for missing package errors
  const packageMatch = rawMessage.match(/Cannot find package '([^']+)'/);
  if (packageMatch) {
    throw configErrors.configDependencyMissing({ configPath, packageName: packageMatch[1] });
  }

  // Check for module not found (different format)
  const moduleMatch = rawMessage.match(/Cannot find module '([^']+)'/);
  if (moduleMatch) {
    const moduleName = moduleMatch[1];
    // If it looks like a package (not a relative path), suggest installing
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      throw configErrors.configDependencyMissing({ configPath, packageName: moduleName });
    }
  }

  // Check for syntax errors
  if (rawMessage.includes('SyntaxError') || rawMessage.includes('Parse error')) {
    throw configErrors.typescriptSyntaxInvalid({ configPath, errorMessage: rawMessage });
  }

  // Check for export not found
  if (rawMessage.includes('Export named') && rawMessage.includes('not found')) {
    throw configErrors.typescriptSyntaxInvalid({ configPath, errorMessage: rawMessage });
  }

  // Prefix the error message with its class name (TypeError, ReferenceError, ...) so the
  // user knows what kind of failure occurred, not just the bare message.
  const errorClassName = error.name && error.name !== 'Error' ? error.name : null;
  const errorMessage = errorClassName ? `${errorClassName}: ${rawMessage}` : rawMessage;

  // A config module is user code and may have side effects. Preserve the best stack Bun gives us, but never execute
  // the module a second time merely to improve an error's code frame.
  const userStackTrace = getUserCodeStackTrace(error) ?? getFilteredRawStack(error);
  throw configErrors.typescriptExecutionFailed({ configPath, errorMessage, userStackTrace });
};

const getFilteredRawStack = (error: Error): string | null => {
  if (!error.stack) return null;
  const lines = error.stack.split('\n');
  const kept = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('at ')) return false;
    const normalized = trimmed.replaceAll('\\', '/');
    if (normalized.includes('/src/utils/file-loaders.ts')) return false;
    if (normalized.includes('/src/domain/config-manager/')) return false;
    if (normalized.includes('/src/utils/errors.ts')) return false;
    if (normalized.includes('processTicksAndRejections')) return false;
    if (normalized.includes('(native)')) return false;
    return true;
  });
  return kept.length ? kept.map((l) => `  ${l.trim()}`).join('\n') : null;
};

type DirectiveToProcess = Directive & {
  pathToProp: string;
  rawDefinition: string;
  params: DirectiveParam[];
  definitionWithoutPath: string;
};

/**
 * Directive results are reused on purpose: a configuration repeats the same definition many times and resolving it
 * once keeps the resolved configuration consistent. Local resolution deliberately returns different values for the
 * same definition (a deployed value instead of a CloudFormation reference), so it keeps its own results.
 */
type DirectiveResultCache = {
  /** Directive result, keyed by the definition without its property path. */
  results: Map<string, unknown>;
  /**
   * Value of the property path applied to a directive result, keyed by the full definition. Runtime resolution can
   * replace returned runtime directives, so its derived values must not leak into authoring-time resolution.
   */
  resultsWithPath: {
    withoutRuntime: Map<string, unknown>;
    withRuntime: Map<string, unknown>;
  };
  /** Resolution already started by an overlapping invocation, keyed by the definition without its property path. */
  pendingResults: Map<string, Promise<unknown>>;
};

/** Queue and options of one `resolveDirectives` invocation. Nested and overlapping invocations each own their queue. */
type DirectiveResolution = {
  cache: DirectiveResultCache;
  queue: Stack<DirectiveToProcess>;
  resultsWithPath: Map<string, unknown>;
  resolveRuntime: boolean;
  useLocalResolve: boolean;
};

type QueuedDirectiveOutcome = 'cached' | 'deferred' | 'resolved';

const createDirectiveResultCache = (): DirectiveResultCache => ({
  results: new Map<string, unknown>(),
  resultsWithPath: {
    withoutRuntime: new Map<string, unknown>(),
    withRuntime: new Map<string, unknown>()
  },
  pendingResults: new Map<string, Promise<unknown>>()
});

const getDirectiveDependenciesUnresolvedError = (rawDefinitions: string[]) => {
  const definitions = [...new Set(rawDefinitions)].sort();
  return new CliError({
    category: 'DIRECTIVE',
    code: 'DIRECTIVE_DEPENDENCIES_UNRESOLVED',
    message: `Directive resolution stopped making progress. These directives never resolved to a value: ${definitions
      .map((definition) => `\`${definition}\``)
      .join(', ')}.`,
    hints: [
      'A directive waits when one of its arguments is another directive that never produces a value.',
      'Check the listed definitions for a directive that returns nothing, or for directives that depend on each other in a cycle.'
    ]
  });
};

export type ConfigResolverContext = Readonly<{
  authoringParams: GetConfigParams;
  builtInDirectives: BuiltInDirectiveContext;
  configPath?: string;
  presetConfig?: StacktapeConfig;
  templateId?: string;
  workingDir: string;
}>;

export class ConfigResolver {
  registeredDirectives: { [name: string]: Directive } = {};
  rawConfig: StacktapeConfig = null;
  resolvedConfig: StacktapeConfig = null;
  transforms: Record<string, ResourceTransform> = {};
  finalTransform: FinalTransform | null = null;
  #context: ConfigResolverContext | undefined;
  #builtInDirectiveNames = new Set<string>();
  #builtInRuntimeDirectiveNames = new Set<string>();
  #normalResolveCache = createDirectiveResultCache();
  #localResolveCache = createDirectiveResultCache();
  #activeDirectiveDefinitions = new AsyncLocalStorage<ReadonlySet<string>>();
  #allCaches = () => [this.#normalResolveCache, this.#localResolveCache];

  private get context(): ConfigResolverContext {
    if (!this.#context) {
      throw new Error('Config resolver was used before its invocation context was initialized.');
    }
    return this.#context;
  }

  loadRawConfig = async ({ context }: { context: ConfigResolverContext }) => {
    this.setContext(context);
    this.rawConfig = await this.getRawConfig();
  };

  setContext = (context: ConfigResolverContext) => {
    this.#context = Object.freeze({ ...context });
  };

  /** Definitions resolved so far, used to identify external inputs that make a rollback unsafe. */
  get resolvedDirectiveDefinitions(): string[] {
    return [...new Set(this.#allCaches().flatMap((cache) => [...cache.results.keys()]))];
  }

  /**
   * Runtime directives describe deployed infrastructure, so their results stop being valid once the stack changes.
   * Path-qualified results are dropped completely because any of them may have been derived from a runtime directive.
   */
  invalidateRuntimeDirectiveResults = () => {
    for (const cache of this.#allCaches()) {
      for (const definition of cache.results.keys()) {
        if (this.#builtInRuntimeDirectiveNames.has(getDirectiveName(definition))) {
          cache.results.delete(definition);
        }
      }
      cache.resultsWithPath.withoutRuntime.clear();
      cache.resultsWithPath.withRuntime.clear();
    }
  };

  reset = () => {
    this.registeredDirectives = {};
    this.#normalResolveCache = createDirectiveResultCache();
    this.#localResolveCache = createDirectiveResultCache();
    this.rawConfig = null;
    this.resolvedConfig = null;
    this.transforms = {};
    this.finalTransform = null;
    this.#context = undefined;
    this.#builtInDirectiveNames = new Set<string>();
    this.#builtInRuntimeDirectiveNames = new Set<string>();
  };

  loadTypescriptConfig = async ({
    filePath,
    authoringParams
  }: {
    filePath: string;
    authoringParams: GetConfigParams;
  }): Promise<CompiledStacktapeConfig> => {
    let defaultExport: unknown;

    try {
      defaultExport = await loadFromTypescript({
        filePath,
        exportName: 'default'
      });
    } catch (error) {
      handleTypescriptConfigError(error as Error, filePath);
    }

    if (!defaultExport) {
      throw configErrors.typescriptExportMissing({ configPath: filePath });
    }
    if (typeof defaultExport !== 'function') {
      throw configErrors.typescriptDefaultExportNotFunction({ configPath: filePath });
    }

    try {
      const configFn = defaultExport as (params: GetConfigParams) => unknown;
      const result = configFn(authoringParams);
      if (!isCompiledStacktapeConfig(result)) {
        throw configErrors.typescriptDefineConfigRequired({ configPath: filePath });
      }
      return result;
    } catch (error) {
      if (error instanceof CliError) throw error;
      handleTypescriptConfigError(error as Error, filePath);
    }
  };

  private useCompiledTypescriptConfig = (compiledConfig: CompiledStacktapeConfig): StacktapeConfig => {
    this.transforms = compiledConfig.transforms;
    this.finalTransform = compiledConfig.finalTransform;
    return compiledConfig.config;
  };

  getRawConfig = async () => {
    const { authoringParams, configPath, presetConfig, templateId, workingDir } = this.context;
    this.transforms = {};
    this.finalTransform = null;

    if (presetConfig) {
      return presetConfig;
    }

    if (templateId) {
      const downloadedTemplate = await stacktapeTrpcApiManager.apiClient.template({
        templateId
      });

      // Try parsing as YAML first
      let yamlParseError: Error | null = null;
      try {
        return parseYaml(downloadedTemplate.content);
      } catch (err) {
        yamlParseError = err;
      }

      const tempConfigPath = localStatePaths.downloadedTemplateFile({ workingDirectory: workingDir, id: randomUUID() });

      let typescriptParseError: Error | null = null;
      let tempConfigFile: FileHandle | undefined;
      let ownsTempConfig = false;
      try {
        tempConfigFile = await open(tempConfigPath, 'wx');
        ownsTempConfig = true;
        await tempConfigFile.writeFile(downloadedTemplate.content);
        await tempConfigFile.close();
        tempConfigFile = undefined;
        const compiledConfig = await this.loadTypescriptConfig({ filePath: tempConfigPath, authoringParams });
        return this.useCompiledTypescriptConfig(compiledConfig);
      } catch (err) {
        typescriptParseError = err;
      } finally {
        await tempConfigFile?.close().catch(() => undefined);
        if (ownsTempConfig) {
          await rm(tempConfigPath, { force: true });
        }
      }

      // Both failed - throw the more relevant error
      if (typescriptParseError) {
        throw typescriptParseError;
      }
      if (yamlParseError) {
        throw yamlParseError;
      }
      return null;
    }

    if (!configPath) {
      return null;
    }

    // Handle TypeScript config files
    if (configPath.endsWith('.ts')) {
      const compiledConfig = await this.loadTypescriptConfig({ filePath: configPath, authoringParams });
      return this.useCompiledTypescriptConfig(compiledConfig);
    }

    // Handle other config file types (YAML, JSON, etc.)
    try {
      let config = await loadFromAnySupportedFile({
        sourcePath: configPath,
        codeType: 'config',
        workingDir
      });

      // If returned value is a function, run it
      if (typeof config === 'function') {
        config = config(authoringParams);
      }

      if (config === null) {
        throw new CliError({
          category: 'FILE_ACCESS',
          code: 'CONFIG_FILE_TYPE_UNSUPPORTED',
          message: `Cannot load Stacktape config from unsupported file type \`${configPath}\`.`
        });
      }

      if (!config) {
        try {
          JSON.parse(JSON.stringify(config));
        } catch {
          throw configErrors.configObjectInvalid({ configPath, config });
        }
      }

      return config;
    } catch (error) {
      if (error instanceof CliError) {
        throw error;
      }
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_FILE_MALFORMED',
        message: `Malformed configuration file at \`${configPath}\`.\n${String(error)}`,
        cause: error
      });
    }
  };

  loadResolvedConfig = async () => {
    this.resolvedConfig = await this.resolveDirectives({ itemToResolve: this.rawConfig, resolveRuntime: false });
  };

  registerUserDirectives = (userDirectives: { name: string; filePath: string }[]) => {
    const { workingDir } = this.context;
    for (const directive of userDirectives) {
      const rawFilePath = directive.filePath;
      const codeType = `directive ${directive.name}`;
      const { filePath } = parseUserCodeFilepath({
        fullPath: rawFilePath,
        codeType,
        workingDir
      });
      if (supportedCodeConfigLanguages.includes(getFileExtension(filePath))) {
        this.registerDirective({
          name: directive.name,
          resolveFunction: () =>
            getUserCodeAsFn({
              filePath: rawFilePath,
              cache: true,
              codeType,
              workingDir
            })
        });
      } else {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_FILE_TYPE_UNSUPPORTED',
          message: `Directive \`${directive.name}\` uses an unsupported file type.`
        });
      }
    }
  };

  registerBuiltInDirectives = () => {
    const directives = createBuiltInDirectives(this.context.builtInDirectives);
    this.#builtInDirectiveNames = new Set(directives.map(({ name }) => name));
    this.#builtInRuntimeDirectiveNames = new Set(
      directives.filter(({ isRuntime }) => isRuntime).map(({ name }) => name)
    );
    directives.forEach(this.registerDirective);
  };

  registerDirective = (directive: Directive | CustomDirective) => {
    if (this.registeredDirectives[directive.name]) {
      throw new CliError({
        category: 'DIRECTIVE',
        code: 'DIRECTIVE_NAME_DUPLICATE',
        message: `Cannot register multiple directives named \`${directive.name}\`. ${
          this.#builtInDirectiveNames.has(directive.name) ? `\`${directive.name}\` is a built-in directive` : ''
        }.`
      });
    }
    this.registeredDirectives[directive.name] = directive as any;
  };

  #enqueueUnresolvedUsedDirectives = async (resolution: DirectiveResolution, obj: any) => {
    return processAllNodes(obj, async (node) => {
      if (getIsDirective(node)) {
        this.#enqueueDirective(resolution, node);
      }
    });
  };

  /**
   * Queues a directive ahead of the directives already waiting, then queues the directives used as its arguments ahead
   * of it, so an argument is always processed before the directive that consumes it.
   */
  #enqueueDirective = (resolution: DirectiveResolution, rawDefinition: string) => {
    const directiveInfo = this.getDirectiveInfo(rawDefinition);
    if (directiveInfo.isRuntime && !resolution.resolveRuntime) {
      return;
    }
    resolution.queue.prepend(directiveInfo);
    directiveInfo.params.forEach((param) => {
      if (param.isDirective) {
        this.#enqueueDirective(resolution, param.definition);
      }
    });
  };

  getDirectiveInfo = (rawDefinition: string): DirectiveToProcess => {
    const name = getDirectiveName(rawDefinition);
    const registeredDirective = this.registeredDirectives[name];
    if (!registeredDirective) {
      throw new CliError({
        category: 'DIRECTIVE',
        code: 'DIRECTIVE_UNKNOWN',
        message: `Unknown directive \`${name}\`. Only built-in and registered custom directives can be used.`,
        hints: 'If this is a custom directive, register it in your Stacktape config.'
      });
    }
    return {
      ...registeredDirective,
      rawDefinition,
      pathToProp: getDirectivePathToProp(rawDefinition).join('.'),
      definitionWithoutPath: getDirectiveWithoutPath(rawDefinition),
      params: getDirectiveParams(name, rawDefinition).map((param: any) =>
        param.isDirective ? { ...param, isRuntime: this.registeredDirectives[param.name]?.isRuntime || false } : param
      )
    };
  };

  #getDirectiveValue = async (resolution: DirectiveResolution, rawDefinition: string) => {
    const directiveResult = resolution.cache.results.get(getDirectiveWithoutPath(rawDefinition));
    if (directiveResult === undefined || directiveResult === null) {
      return null;
    }
    const pathToProp = getDirectivePathToProp(rawDefinition).join('.');
    const value = await this.#getValueFromDirectiveResult(directiveResult, pathToProp, rawDefinition);

    if (value === undefined) {
      throw new CliError({
        category: 'DIRECTIVE',
        code: 'DIRECTIVE_RESULT_PATH_UNRESOLVED',
        message: `Property path \`${pathToProp}\` is not available on the result of directive \`${getDirectiveWithoutPath(
          rawDefinition
        )}\`.`
      });
    }
    return value;
  };

  #getValueFromDirectiveResult = async (directiveResult: any, pathToProp: string, rawDefinition: string) => {
    // @note this is for lazy-loading specific properties
    if (directiveResult.__getValueFn) {
      return directiveResult.__getValueFn(pathToProp);
    }
    if (pathToProp.length) {
      const { resultValue, validPath, restPath } = traverseToMaximalExtent(directiveResult, pathToProp);
      // if there is a restPath:
      // - there either might be directive to be resolved before we can apply restPath on its result
      // - or we have hit a dead-end. In latter case we throw error
      if (restPath.length) {
        if (getIsDirective(resultValue)) {
          return `${resultValue}.${restPath}`;
        }
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_RESULT_PATH_UNRESOLVED',
          message: `Property path \`${pathToProp}\` is not available on the result of directive \`${getDirectiveWithoutPath(
            rawDefinition
          )}\`.${
            validPath
              ? ` The longest resolvable path is \`${validPath}\`, whose value is \`${isNonNullObject(resultValue) ? JSON.stringify(resultValue) : resultValue}\`.`
              : ''
          }`
        });
      }
      // if there was no rest path it means the whole path resolved successfully
      return resultValue;
    }
    return directiveResult;
  };

  #processQueuedDirective = async (
    resolution: DirectiveResolution,
    directive: DirectiveToProcess
  ): Promise<QueuedDirectiveOutcome> => {
    const { cache } = resolution;
    const { resultsWithPath } = resolution;

    // Presence, not truthiness: a directive that legitimately resolved to `false`, `0` or `''` is resolved.
    if (resultsWithPath.has(directive.rawDefinition)) {
      return 'cached';
    }
    if (cache.results.has(directive.definitionWithoutPath) && !directive.lazyLoad) {
      resultsWithPath.set(directive.rawDefinition, await this.#getDirectiveValue(resolution, directive.rawDefinition));
      return 'cached';
    }

    directive.params.forEach((param) => {
      if (param.isDirective) {
        const { isRuntime } = this.getDirectiveInfo(param.definition);
        if (isRuntime && !directive.isRuntime) {
          throw new CliError({
            category: 'DIRECTIVE',
            code: 'DIRECTIVE_RUNTIME_DEPENDENCY_INVALID',
            message: `Non-runtime directive \`${directive.name}\` cannot depend on runtime directive \`${param.name}\`.`
          });
        }
      }
    });

    const params = await Promise.all(
      directive.params.map(async (param) => {
        if (param.value !== null) {
          return param.value;
        }
        return this.#getDirectiveValue(resolution, param.definition);
      })
    );

    if (params.some((param) => param === null || param === undefined)) {
      resolution.queue.append(directive);
      return 'deferred';
    }

    if (directive.requiredParams) {
      validatePrimitiveFunctionParams(params, directive.requiredParams, `Directive ${directive.name}`);
    }

    const resultKey = directive.definitionWithoutPath;
    let pendingResult = cache.pendingResults.get(resultKey);
    const activeDefinitions = this.#activeDirectiveDefinitions.getStore();
    if (pendingResult && activeDefinitions?.has(resultKey)) {
      throw getDirectiveDependenciesUnresolvedError([...activeDefinitions, resultKey]);
    }
    if (!pendingResult) {
      const fn =
        directive.localResolveFunction && resolution.useLocalResolve
          ? directive.localResolveFunction
          : directive.resolveFunction;
      const nestedActiveDefinitions = new Set(activeDefinitions);
      nestedActiveDefinitions.add(resultKey);
      pendingResult = this.#activeDirectiveDefinitions.run(nestedActiveDefinitions, () =>
        Promise.resolve().then(() => fn(this)(...params))
      );
      cache.pendingResults.set(resultKey, pendingResult);
    }

    let result: unknown;
    try {
      result = await pendingResult;
    } finally {
      if (cache.pendingResults.get(resultKey) === pendingResult) {
        cache.pendingResults.delete(resultKey);
      }
    }
    cache.results.set(directive.definitionWithoutPath, result);
    resultsWithPath.set(directive.rawDefinition, await this.#getDirectiveValue(resolution, directive.rawDefinition));
    return 'resolved';
  };

  /**
   * Drains the invocation's queue. A directive whose arguments are not resolved yet goes back to the end of the queue,
   * so the queue is worked through in passes. A pass in which every directive was deferred can never make progress on
   * a later pass either, so resolution fails there instead of looping.
   */
  #processDirectives = async (resolution: DirectiveResolution) => {
    let directivesInPass = resolution.queue.length;
    let processedInPass = 0;
    let deferredInPass: DirectiveToProcess[] = [];

    while (resolution.queue.length) {
      const directive = resolution.queue.pop();
      let outcome: QueuedDirectiveOutcome;
      try {
        outcome = await this.#processQueuedDirective(resolution, directive);
      } catch (err) {
        if (err instanceof CliError) {
          throw err;
        }
        throw new Error(`Error processing directive ${directive.definitionWithoutPath}.`, { cause: err });
      }
      if (outcome !== 'cached') {
        this.#adoptAliasedResults(resolution.resultsWithPath);
      }

      processedInPass += 1;
      if (outcome === 'deferred') {
        deferredInPass.push(directive);
      }
      if (processedInPass === directivesInPass) {
        if (deferredInPass.length === directivesInPass) {
          throw getDirectiveDependenciesUnresolvedError(deferredInPass.map(({ rawDefinition }) => rawDefinition));
        }
        directivesInPass = resolution.queue.length;
        processedInPass = 0;
        deferredInPass = [];
      }
    }
  };

  /**
   * A directive may resolve to another directive's definition. Once that definition has a value, the results pointing
   * at it adopt that value so the configuration reaches a fixed point instead of keeping the intermediate definition.
   */
  #adoptAliasedResults = (resultsWithPath: Map<string, unknown>) => {
    for (const [rawDefinition, value] of resultsWithPath) {
      if (typeof value === 'string' && resultsWithPath.has(value)) {
        resultsWithPath.set(rawDefinition, resultsWithPath.get(value));
      }
    }
  };

  #replaceDirectiveNodesWithResults = async (resolution: DirectiveResolution, obj: any) => {
    return processAllNodes(obj, async (node) => {
      if (!getIsDirective(node)) {
        return node;
      }
      if (!resolution.resolveRuntime && this.getDirectiveInfo(node).isRuntime) {
        return node;
      }

      if (!resolution.resultsWithPath.has(node)) {
        return node;
      }

      const value = resolution.resultsWithPath.get(node);
      if (value === undefined || value === null) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_VALUE_MISSING',
          message: `Directive \`${node}\` did not return a value.`
        });
      }

      return serialize(value);
    });
  };

  collectRemainingDirectives = async ({ obj, resolveRuntime }: { obj: any; resolveRuntime: boolean }) => {
    const foundDirectives = new Set<string>();

    await processAllNodes(obj, async (node) => {
      if (getIsDirective(node)) {
        const directiveInfo = this.getDirectiveInfo(node);
        if (!directiveInfo.isRuntime || resolveRuntime) {
          foundDirectives.add(node);
        }
      }

      return node;
    });

    return Array.from(foundDirectives);
  };

  resolveDirectives = async <T>({
    itemToResolve,
    resolveRuntime,
    useLocalResolve
  }: {
    itemToResolve: any;
    resolveRuntime: boolean;
    useLocalResolve?: boolean;
  }): Promise<T> => {
    const cache = useLocalResolve ? this.#localResolveCache : this.#normalResolveCache;
    const resolution: DirectiveResolution = {
      cache,
      queue: new Stack<DirectiveToProcess>(),
      resultsWithPath: resolveRuntime ? cache.resultsWithPath.withRuntime : cache.resultsWithPath.withoutRuntime,
      resolveRuntime,
      useLocalResolve: useLocalResolve === true
    };
    let result = serialize(itemToResolve);

    if (getIsDirective(itemToResolve)) {
      this.#enqueueDirective(resolution, itemToResolve);
    } else {
      await this.#enqueueUnresolvedUsedDirectives(resolution, result);
    }

    let shouldScanResolvedResult = false;
    let previouslyRemaining: string | null = null;
    while (resolution.queue.length || shouldScanResolvedResult) {
      if (shouldScanResolvedResult) {
        await this.#enqueueUnresolvedUsedDirectives(resolution, result);
      }
      await this.#processDirectives(resolution);
      try {
        result = await this.#replaceDirectiveNodesWithResults(resolution, result);
      } catch (error) {
        throw new CliError({
          category: 'DIRECTIVE',
          code: 'DIRECTIVE_RESULT_INVALID',
          message: 'Failed to process directives because a directive returned an invalid value.',
          cause: error
        });
      }
      const remainingDirectives = await this.collectRemainingDirectives({ obj: result, resolveRuntime });
      const remaining = [...remainingDirectives].sort().join(', ');
      // A directive result may itself use directives, which the next pass resolves. A pass that leaves exactly the
      // directives it started with (a directive resolving to its own definition) can never resolve them either.
      if (remainingDirectives.length && remaining === previouslyRemaining) {
        throw getDirectiveDependenciesUnresolvedError(remainingDirectives);
      }
      previouslyRemaining = remaining;
      shouldScanResolvedResult = remainingDirectives.length > 0;
    }
    return result;
  };
}

// configResolver is only used in configManager therefore it is instantiated as a part of configManager
// if configResolver is a domain service which needs to be accessed by other services, it should be made into separate service with its own directory

// export const configResolver = new ConfigResolver();
