import type { GetConfigParams } from '@api/npm/ts';
import type { DirectiveParam } from '@utils/directives';
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
  getIsDirective
} from '@utils/directives';
import { ExpectedError, UnexpectedError } from '@utils/errors';
import { loadFromAnySupportedFile, loadFromTypescript } from '@utils/file-loaders';
import { getUserCodeAsFn, parseUserCodeFilepath } from '@utils/user-code-processing';
import { validatePrimitiveFunctionParams } from '@utils/validation-utils';
import { builtInDirectives } from './built-in-directives';

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
    // raw config could have been preloaded, see temporary function `temporaryPreloadConfigForServiceNameDeprecationValidation`
    // in that case it is "redundant" to load the config again
    this.rawConfig = this.rawConfig || (await this.getRawConfig());
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

  getRawConfig = async () => {
    if (globalStateManager.presetConfig) {
      return globalStateManager.presetConfig;
    }
    if (globalStateManager.args.templateId) {
      const downloadedTemplate = await stacktapeTrpcApiManager.apiClient.template({
        templateId: globalStateManager.args.templateId
      });
      return parseYaml(downloadedTemplate.content);
    }
    try {
      let config;

      // Special case for TypeScript config files
      if (globalStateManager.configPath.endsWith('.ts')) {
        const [getConfigFunction, defaultExport] = await Promise.all([
          loadFromTypescript({
            filePath: globalStateManager.configPath,
            exportName: 'getConfig'
          }),
          loadFromTypescript({
            filePath: globalStateManager.configPath,
            exportName: 'default'
          })
        ]);

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
        if (getConfigFunction) {
          if (typeof getConfigFunction !== 'function') {
            throw stpErrors.e128({ configPath: globalStateManager.configPath });
          }
          config = getConfigFunction(params);
        }
        // handle defineConfig-style config files
        else if (defaultExport && typeof defaultExport === 'function') {
          config = defaultExport(params);
        }
      }

      // If config not loaded yet, try loadFromAnySupportedFile
      if (!config) {
        config = await loadFromAnySupportedFile({
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
      }

      if (!config) {
        if (config === null) {
          throw new ExpectedError(
            'FILE_ACCESS',
            `Can't load stacktape config from unsupported file type ${globalStateManager.configPath}.`
          );
        }

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
      if (getIsDirective(node)) {
        this.addDirectiveToProcess(node, resolveRuntime, false);
      }
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
      await this.enqueueUnresolvedUsedDirectives({ obj: result, resolveRuntime });
    }

    let isFirstRun = true;
    while (this.directivesToProcess.length) {
      if (!isFirstRun) {
        await this.enqueueUnresolvedUsedDirectives({ obj: result, resolveRuntime });
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
