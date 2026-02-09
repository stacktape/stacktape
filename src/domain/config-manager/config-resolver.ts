import type { GetConfigParams } from '@api/npm/ts/config';
import type { DirectiveParam } from '@utils/directives';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { stacktapeTrpcApiManager } from '@application-services/stacktape-trpc-api-manager';
import { supportedCodeConfigLanguages } from '@config';
import { stpErrors } from '@errors';
import { getFileExtension } from '@shared/utils/fs-utils';
import { isNonNullObject, processAllNodes, replaceAll, serialize, traverseToMaximalExtent } from '@shared/utils/misc';
import { parseYaml } from '@shared/utils/yaml';
import { Stack } from '@utils/collections';
import {
  getDirectiveName,
  getDirectiveParams,
  getDirectivePathToProp,
  getDirectiveWithoutPath,
  getIsDirective,
  rewriteEmbeddedDirectivesToCfFormat
} from '@utils/directives';
import { ExpectedError, getUserCodeStackTrace, UnexpectedError } from '@utils/errors';
import { loadFromAnySupportedFile, loadFromTypescript } from '@utils/file-loaders';
import { getUserCodeAsFn, parseUserCodeFilepath } from '@utils/user-code-processing';
import { validatePrimitiveFunctionParams } from '@utils/validation-utils';
import { remove, writeFile } from 'fs-extra';
import { builtInDirectives } from './built-in-directives';

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
  const errorMessage = error.message || String(error);

  // Handle AggregateError (Bun build errors)
  if (error.constructor.name === 'AggregateError' && 'errors' in error) {
    const aggregateError = error as Error & { errors: BuildError[] };
    if (aggregateError.errors?.length) {
      const formattedErrors = formatBuildErrors(aggregateError.errors);
      throw stpErrors.e137({ configPath, errorMessage: formattedErrors });
    }
  }

  // Check for missing package errors
  const packageMatch = errorMessage.match(/Cannot find package '([^']+)'/);
  if (packageMatch) {
    throw stpErrors.e136({ configPath, packageName: packageMatch[1] });
  }

  // Check for module not found (different format)
  const moduleMatch = errorMessage.match(/Cannot find module '([^']+)'/);
  if (moduleMatch) {
    const moduleName = moduleMatch[1];
    // If it looks like a package (not a relative path), suggest installing
    if (!moduleName.startsWith('.') && !moduleName.startsWith('/')) {
      throw stpErrors.e136({ configPath, packageName: moduleName });
    }
  }

  // Check for syntax errors
  if (errorMessage.includes('SyntaxError') || errorMessage.includes('Parse error')) {
    throw stpErrors.e137({ configPath, errorMessage });
  }

  // Check for export not found
  if (errorMessage.includes('Export named') && errorMessage.includes('not found')) {
    throw stpErrors.e137({ configPath, errorMessage });
  }

  // Generic execution error - try to extract user stack trace
  const userStackTrace = getUserCodeStackTrace(error);
  throw stpErrors.e138({ configPath, errorMessage, userStackTrace });
};

type DirectiveToProcess = Directive & {
  pathToProp: string;
  rawDefinition: string;
  params: DirectiveParam[];
  definitionWithoutPath: string;
};

export class ConfigResolver {
  directivesToProcess = new Stack<DirectiveToProcess>();
  registeredDirectives: { [name: string]: Directive } = {};
  results: { [rawDefinition: string]: any } = {};
  resultsWithPath: { [rawDefinitionWithPath: string]: any } = {};
  rawConfig: StacktapeConfig = null;
  resolvedConfig: StacktapeConfig = null;

  loadConfig = async () => {
    await this.loadRawConfig();
    this.registerUserDirectives(this.rawConfig?.directives || []);
    await this.loadResolvedConfig();
  };

  loadRawConfig = async () => {
    this.rawConfig = await this.getRawConfig();
  };

  reset = () => {
    this.directivesToProcess = new Stack<DirectiveToProcess>();
    this.registeredDirectives = {};
    this.results = {};
    this.resultsWithPath = {};
    this.rawConfig = null;
    this.resolvedConfig = null;
  };

  /**
   * Strips transforms and finalTransform from the config object.
   * Transforms are functions and cannot be serialized.
   * They are extracted separately by TransformsResolver.
   */
  private stripTransformsFromConfig = (config: StacktapeConfig) => {
    // Strip finalTransform from the root config
    if ('finalTransform' in (config as any)) {
      delete (config as any).finalTransform;
    }

    if (!config?.resources) {
      return;
    }

    // Strip transforms from each resource
    for (const resourceName in config.resources) {
      const resource = config.resources[resourceName] as Record<string, any>;
      if (resource && 'transforms' in resource) {
        delete resource.transforms;
      }
    }
  };

  loadTypescriptConfig = async ({ filePath }: { filePath: string }) => {
    let getConfigFunction: unknown;
    let defaultExport: unknown;

    try {
      [getConfigFunction, defaultExport] = await Promise.all([
        loadFromTypescript({
          filePath,
          exportName: 'getConfig'
        }),
        loadFromTypescript({
          filePath,
          exportName: 'default'
        })
      ]);
    } catch (error) {
      handleTypescriptConfigError(error as Error, filePath);
    }

    const params: GetConfigParams = {
      projectName: globalStateManager.targetStack?.projectName || globalStateManager.args.projectName,
      stage: globalStateManager.targetStack?.stage || globalStateManager.args.stage,
      region: globalStateManager.region,
      command: globalStateManager.command,
      awsProfile: globalStateManager.awsProfileName,
      user: {
        id: globalStateManager.userData.id,
        name: globalStateManager.userData.name,
        email: globalStateManager.userData.email
      },
      cliArgs: globalStateManager.args
    };

    // Prefer getConfig export over default export
    if (getConfigFunction) {
      if (typeof getConfigFunction !== 'function') {
        throw stpErrors.e128({ configPath: filePath });
      }
      try {
        const result = getConfigFunction(params);
        if (result === null || result === undefined || typeof result !== 'object') {
          throw stpErrors.e140({ configPath: filePath, exportValue: String(result) });
        }
        return result;
      } catch (error) {
        if ((error as any).isExpected) throw error;
        handleTypescriptConfigError(error as Error, filePath);
      }
    }

    // Handle defineConfig-style config files
    if (defaultExport && typeof defaultExport === 'function') {
      try {
        const configFn = defaultExport as (params: GetConfigParams) => unknown;
        const result = configFn(params);
        if (result === null || result === undefined || typeof result !== 'object') {
          throw stpErrors.e140({ configPath: filePath, exportValue: String(result) });
        }
        return result;
      } catch (error) {
        if ((error as any).isExpected) throw error;
        handleTypescriptConfigError(error as Error, filePath);
      }
    }

    // No valid export found
    if (!getConfigFunction && !defaultExport) {
      throw stpErrors.e139({ configPath: filePath });
    }

    // Export exists but is not a function
    if (defaultExport && typeof defaultExport !== 'function') {
      throw stpErrors.e128({ configPath: filePath });
    }

    return null;
  };

  getRawConfig = async () => {
    if (globalStateManager.presetConfig) {
      return globalStateManager.presetConfig;
    }

    if (globalStateManager.args.templateId) {
      const downloadedTemplate = await stacktapeTrpcApiManager.apiClient.template({
        templateId: globalStateManager.args.templateId
      });

      // Try parsing as YAML first
      let yamlParseError: Error | null = null;
      try {
        return parseYaml(downloadedTemplate.content);
      } catch (err) {
        yamlParseError = err;
      }

      const tempConfigPath = join(process.cwd(), '__temp-config.stp.ts');
      await writeFile(tempConfigPath, downloadedTemplate.content);

      let typescriptParseError: Error | null = null;
      try {
        return await this.loadTypescriptConfig({ filePath: tempConfigPath });
      } catch (err) {
        typescriptParseError = err;
      } finally {
        await remove(tempConfigPath);
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

    // Handle TypeScript config files
    if (globalStateManager.configPath.endsWith('.ts')) {
      const config = await this.loadTypescriptConfig({ filePath: globalStateManager.configPath });

      // Strip transforms from config (they are functions and can't be serialized)
      // Transforms are extracted separately by TransformsResolver
      if (config) {
        this.stripTransformsFromConfig(config);
      }

      return config;
    }

    // Handle other config file types (YAML, JSON, etc.)
    try {
      let config = await loadFromAnySupportedFile({
        sourcePath: globalStateManager.configPath,
        codeType: 'config',
        workingDir: globalStateManager.workingDir
      });

      // If returned value is a function, run it
      if (typeof config === 'function') {
        config = config({
          projectName: globalStateManager.targetStack?.projectName || globalStateManager.args.projectName,
          stage: globalStateManager.targetStack?.stage || globalStateManager.args.stage,
          region: globalStateManager.region,
          command: globalStateManager.command,
          awsProfile: globalStateManager.awsProfileName,
          user: {
            id: globalStateManager.userData.id,
            name: globalStateManager.userData.name,
            email: globalStateManager.userData.email
          },
          cliArgs: globalStateManager.args
        });
      }

      if (config === null) {
        throw new ExpectedError(
          'FILE_ACCESS',
          `Can't load stacktape config from unsupported file type ${globalStateManager.configPath}.`
        );
      }

      if (!config) {
        try {
          JSON.parse(JSON.stringify(config));
        } catch {
          throw stpErrors.e129({ configPath: globalStateManager.configPath, config });
        }
      }

      // Strip transforms from config (they are functions and can't be serialized)
      // Transforms are extracted separately by TransformsResolver
      this.stripTransformsFromConfig(config);

      return config;
    } catch (err) {
      if ((err as any).isExpected) {
        throw err;
      }
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Malformed configuration file at ${globalStateManager.configPath}. Error details:\n${err}`
      );
    }
  };

  loadResolvedConfig = async () => {
    this.resolvedConfig = await this.resolveDirectives({ itemToResolve: this.rawConfig, resolveRuntime: false });
  };

  registerUserDirectives = (userDirectives: { name: string; filePath: string }[]) => {
    for (const directive of userDirectives) {
      const rawFilePath = directive.filePath;
      const codeType = `directive ${directive.name}`;
      const { filePath } = parseUserCodeFilepath({
        fullPath: rawFilePath,
        codeType,
        workingDir: globalStateManager.workingDir
      });
      if (supportedCodeConfigLanguages.includes(getFileExtension(filePath))) {
        this.registerDirective({
          name: directive.name,
          resolveFunction: () =>
            getUserCodeAsFn({
              filePath: rawFilePath,
              cache: true,
              codeType,
              workingDir: globalStateManager.workingDir
            })
        });
      } else {
        throw new ExpectedError('DIRECTIVE', `Unsupported file format for directive ${directive.name}`);
      }
    }
  };

  registerBuiltInDirectives = () => {
    builtInDirectives.forEach(this.registerDirective);
  };

  registerDirective = (directive: Directive | CustomDirective) => {
    if (this.registeredDirectives[directive.name]) {
      throw new ExpectedError(
        'DIRECTIVE',
        `Can't have multiple directives with the same name: ${directive.name}. ${
          builtInDirectives.map((d) => d.name).includes(directive.name)
            ? `${directive.name} is a built-in directive`
            : ''
        }.`
      );
    }
    this.registeredDirectives[directive.name] = directive as any;
  };

  enqueueUnresolvedUsedDirectives = async ({ obj, resolveRuntime }: { obj: any; resolveRuntime?: boolean }) => {
    return processAllNodes(obj, async (node) => {
      let processedNode = node;

      if (typeof processedNode === 'string') {
        const rewrittenDirective = rewriteEmbeddedDirectivesToCfFormat(
          processedNode,
          Object.keys(this.registeredDirectives)
        );
        if (rewrittenDirective !== null) {
          processedNode = rewrittenDirective;
        }
      }

      if (getIsDirective(processedNode)) {
        this.addDirectiveToProcess(processedNode, resolveRuntime, false);
      }

      return processedNode;
    });
  };

  addDirectiveToProcess = (rawDefinition: string, includeRuntime?: boolean, append?: boolean) => {
    const directiveInfo = this.getDirectiveInfo(rawDefinition);
    if (directiveInfo.isRuntime && !includeRuntime) {
      return;
    }
    if (append) {
      this.directivesToProcess.append(directiveInfo);
    } else {
      this.directivesToProcess.prepend(directiveInfo);
    }
    directiveInfo.params.forEach((param) => {
      if (param.isDirective) {
        this.addDirectiveToProcess(param.definition, includeRuntime);
      }
    });
  };

  getDirectiveInfo = (rawDefinition: string): DirectiveToProcess => {
    const name = getDirectiveName(rawDefinition);
    const registeredDirective = this.registeredDirectives[name];
    if (!registeredDirective) {
      throw new ExpectedError(
        'DIRECTIVE',
        `Unknown directive ${name}. You can only use built-in and custom directives.`,
        'Did you forget to register your custom directive?'
      );
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

  getDirectiveValue = async ({
    rawDefinition,
    resolveRuntime,
    useLocalResolve
  }: {
    rawDefinition: string;
    resolveRuntime: boolean;
    useLocalResolve: boolean;
  }) => {
    const directiveResult = this.results[getDirectiveWithoutPath(rawDefinition)];
    if (directiveResult === undefined || directiveResult === null) {
      return null;
    }
    const pathToProp = getDirectivePathToProp(rawDefinition).join('.');
    const value = await this.#getValueFromDirectiveResult(directiveResult, pathToProp, rawDefinition);

    if (value === undefined) {
      throw new ExpectedError(
        'DIRECTIVE',
        `Property with path ${pathToProp} is not accessible on result of directive ${getDirectiveWithoutPath(
          rawDefinition
        )}.`
      );
    }
    if (getIsDirective(value)) {
      return this.resolveDirectives({ itemToResolve: value, resolveRuntime, useLocalResolve });
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
        throw new ExpectedError(
          'DIRECTIVE',
          `Property with path "${pathToProp}" is not accessible on result of directive ${getDirectiveWithoutPath(
            rawDefinition
          )}.${validPath ? `Longest resolvable partial path is "${validPath}" with result "${isNonNullObject(resultValue) ? JSON.stringify(resultValue) : resultValue}".` : ''} `
        );
      }
      // if there was no rest path it means the whole path resolved successfully
      return resultValue;
    }
    return directiveResult;
  };

  processDirectives = async ({
    resolveRuntime,
    useLocalResolve
  }: {
    resolveRuntime: boolean;
    useLocalResolve: boolean;
  }) => {
    while (this.directivesToProcess.length) {
      const directive = this.directivesToProcess.pop();
      try {
        if (
          this.results[directive.definitionWithoutPath] &&
          !directive.lazyLoad &&
          !this.resultsWithPath[directive.rawDefinition]
        ) {
          const value = await this.getDirectiveValue({
            rawDefinition: directive.rawDefinition,
            resolveRuntime,
            useLocalResolve
          });
          this.resultsWithPath[directive.rawDefinition] = value;
          continue;
        }
        if (this.resultsWithPath[directive.rawDefinition]) {
          continue;
        }

        directive.params.forEach((param) => {
          if (param.isDirective) {
            const { isRuntime } = this.getDirectiveInfo(param.definition);
            if (isRuntime && !directive.isRuntime) {
              throw new ExpectedError(
                'DIRECTIVE',
                `Non-runtime directive ${directive.name} can't be dependent on a result of runtime directive ${param.name}.`
              );
            }
          }
        });

        const params = await Promise.all(
          directive.params.map(async (param) => {
            if (param.value !== null) {
              return param.value;
            }
            return this.getDirectiveValue({
              rawDefinition: param.definition,
              resolveRuntime,
              useLocalResolve
            });
          })
        );

        if (params.find((param) => param === null || param === undefined)) {
          this.directivesToProcess.append(directive);
        } else {
          if (directive.requiredParams) {
            validatePrimitiveFunctionParams(params, directive.requiredParams, `Directive ${directive.name}`);
          }

          const fn =
            directive.localResolveFunction && useLocalResolve
              ? directive.localResolveFunction
              : directive.resolveFunction;
          const result = await fn(this)(...params);
          this.results[directive.definitionWithoutPath] = result;
          this.resultsWithPath[directive.rawDefinition] = await this.getDirectiveValue({
            rawDefinition: directive.rawDefinition,
            resolveRuntime,
            useLocalResolve
          });
        }
      } catch (err) {
        if (err.isExpected) {
          throw err;
        }
        throw new UnexpectedError({
          customMessage: `Error processing directive ${directive.definitionWithoutPath}.\n`,
          error: err
        });
      }
      for (const rawDefinition in this.resultsWithPath) {
        const value = this.resultsWithPath[rawDefinition];
        if (this.resultsWithPath[value]) {
          this.resultsWithPath[rawDefinition] = this.resultsWithPath[value];
        }
      }
    }
  };

  replaceDirectiveStringsWithResults = (obj: any) => {
    let result;
    try {
      result = JSON.stringify(obj);
      for (const rawDefinition in this.resultsWithPath) {
        const value = this.resultsWithPath[rawDefinition];
        if (value === undefined && value === null) {
          throw new ExpectedError('DIRECTIVE', `Directive ${rawDefinition} did not return a value.`);
        }
        result = replaceAll(
          `"${rawDefinition}"`,
          value !== undefined && value !== null ? JSON.stringify(value) : null,
          result
        );
      }
      // @todo This can fail sometimes, for some reason, with this error (from receipts)
      // Error: SyntaxError: Unexpected token { in JSON at position 88169
      result = JSON.parse(result);
    } catch {
      throw new ExpectedError(
        'DIRECTIVE',
        'Failed to process directives. You might be using directive as an object key. This behavior is not supported.'
      );
    }
    return result;
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
    let result = serialize(itemToResolve);

    if (getIsDirective(itemToResolve)) {
      this.addDirectiveToProcess(itemToResolve, resolveRuntime);
    } else {
      result = await this.enqueueUnresolvedUsedDirectives({ obj: result, resolveRuntime });
    }

    let isFirstRun = true;
    while (this.directivesToProcess.length) {
      if (!isFirstRun) {
        result = await this.enqueueUnresolvedUsedDirectives({ obj: result, resolveRuntime });
      }
      await this.processDirectives({ resolveRuntime, useLocalResolve });
      try {
        result = this.replaceDirectiveStringsWithResults(result);
      } catch {
        throw new ExpectedError(
          'DIRECTIVE',
          'Failed to process directives. One of the directives probably returned an invalid value.'
        );
      }
      isFirstRun = false;
    }
    return result;
  };
}

// configResolver is only used in configManager therefore it is instantiated as a part of configManager
// if configResolver is a domain service which needs to be accessed by other services, it should be made into separate service with its own directory

// export const configResolver = new ConfigResolver();
