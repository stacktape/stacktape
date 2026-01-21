import type { ErrorObject } from 'ajv';
import { join } from 'node:path';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import {
  lambdaRuntimesForFileExtension,
  linksMap,
  supportedAwsCdkConstructExtensions,
  supportedWorkloadExtensions
} from '@config';
import { stpErrors } from '@errors';
import configSchemaValidator from '@schemas/validate-config-schema';
import { isDirAccessible, isFileAccessible } from '@shared/utils/fs-utils';
import {
  capitalizeFirstLetter,
  getUniqueDuplicates,
  isAlphanumeric,
  processAllNodesSync,
  replaceAll,
  splitStringIntoLines
} from '@shared/utils/misc';
import { getIsDirective } from '@utils/directives';
import { ExpectedError, UnexpectedError } from '@utils/errors';
import { parseUserCodeFilepath } from '@utils/user-code-processing';
import get from 'lodash/get';
import isEqual from 'lodash/isEqual';
import uniqWith from 'lodash/uniqWith';
import configSchema from '../../../../@generated/schemas/config-schema.json' with { type: 'json' };
import { configManager } from '../index';
import { validateApplicationLoadBalancerConfig } from './application-load-balancers';
import { resolveReferenceToBastion } from './bastion';
import { validateBucketConfig } from './buckets';
import { validateHttpApiGatewayConfig } from './http-api-gateways';
import { validateLambdaConfig } from './lambdas';
import { validateMultiContainerWorkloadConfig } from './multi-container-workloads';
import { validateNetworkLoadBalancerConfig } from './network-load-balancers';
import { validateNextjsWebConfig } from './nextjs-webs';
import { validateRelationalDatabaseConfig } from './relational-databases';
import { validateSnsTopicConfig } from './sns-topics';
import { validateSqsQueueConfig } from './sqs-queues';
import { validateWebServiceConfig } from './web-services';
import { validateConfigWithZod } from './zod-validator';

export const validatePackagingProps = ({
  packaging,
  workloadName,
  containerName,
  lambdaRuntime,
  workloadType
}: {
  packaging: AllSupportedPackagingConfig;
  workloadName: string;
  containerName?: string;
  lambdaRuntime?: LambdaRuntime;
  workloadType: StpWorkloadType;
}) => {
  const prettyIdentifier = `${capitalizeFirstLetter(workloadType)} ${tuiManager.makeBold(workloadName)}${
    containerName && workloadType === 'multi-container-workload'
      ? ` (container ${tuiManager.makeBold(containerName)})`
      : ''
  }`;
  const cwdHint = `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
    'currentWorkingDirectory'
  )} or the directory containing Stacktape configuration file.`;
  if (packaging.type === 'stacktape-image-buildpack' || packaging.type === 'stacktape-lambda-buildpack') {
    const { entryfilePath } = packaging.properties;
    const { extension, filePath, handler, hasExplicitHandler } = parseUserCodeFilepath({
      codeType: `${prettyIdentifier} entryfilePath`,
      fullPath: entryfilePath,
      workingDir: globalStateManager.workingDir
    });
    if (!supportedWorkloadExtensions.includes(extension as SupportedFileExt)) {
      const issue: string = {
        java: linksMap.javaWorkloadIssue,
        py: linksMap.pythonWorkloadIssue,
        cs: linksMap.csharpWorkloadIssue,
        rb: linksMap.rubyWorkloadIssue,
        go: linksMap.goWorkloadIssue
      }[extension];
      if (!issue) {
        throw new ExpectedError('PACKAGING_CONFIG', `${prettyIdentifier} has unsupported file extension ${extension}`);
      }
      throw new ExpectedError(
        'NOT_YET_IMPLEMENTED',
        `Packaging .${extension} compute resources is not yet supported.`,
        issue
      );
    }

    if (filePath && workloadType === 'function') {
      const allowedRuntimes = lambdaRuntimesForFileExtension[extension];
      if (!allowedRuntimes) {
        throw new ExpectedError(
          'PACKAGING_CONFIG',
          `${prettyIdentifier} has unsupported entryfile extension ${extension} for file ${tuiManager.prettyFilePath(
            filePath
          )}`
        );
      }
      if (lambdaRuntime && !allowedRuntimes.includes(lambdaRuntime)) {
        throw new ExpectedError(
          'PACKAGING_CONFIG',
          `${prettyIdentifier} has unsupported runtime ${lambdaRuntime} for entryfile with extension .${extension}`
        );
      }
    }
    if (!isFileAccessible(filePath)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s entryfilePath ${filePath} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
    if (extension === 'py') {
      validateStacktapeBuildpackPythonPackagingProps({
        packaging,
        workloadName,
        workloadType,
        hasAppVariableSpecified: hasExplicitHandler,
        appVariable: handler
      });
    }
  } else if (packaging.type === 'custom-dockerfile') {
    const { dockerfilePath, buildContextPath } = packaging.properties;
    const fullLocation = buildContextPath
      ? join(globalStateManager.workingDir, buildContextPath, dockerfilePath || 'Dockerfile')
      : join(globalStateManager.workingDir, dockerfilePath || 'Dockerfile');
    if (!isFileAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s dockerfilePath ${tuiManager.prettyFilePath(
          fullLocation
        )} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  } else if (packaging.type === 'custom-artifact') {
    const { packagePath } = packaging.properties;
    const fullLocation = join(globalStateManager.workingDir, packagePath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s packagePath ${tuiManager.prettyFilePath(fullLocation)} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  } else if (packaging.type === 'external-buildpack') {
    const { sourceDirectoryPath } = packaging.properties;
    const fullLocation = join(globalStateManager.workingDir, sourceDirectoryPath);
    if (!isFileAccessible(fullLocation) && !isDirAccessible(fullLocation)) {
      throw new ExpectedError(
        'PACKAGING_CONFIG',
        `${prettyIdentifier}'s sourceDirectoryPath ${tuiManager.prettyFilePath(
          fullLocation
        )} doesn't exist or is not accessible.`,
        cwdHint
      );
    }
  }
  // @todo validate prebuilt-image?
};

const validateStacktapeBuildpackPythonPackagingProps = ({
  packaging,
  workloadName,
  hasAppVariableSpecified,
  appVariable,
  workloadType
}: {
  packaging: StpBuildpackCwImagePackaging | StpBuildpackBjImagePackaging | StpBuildpackLambdaPackaging;
  workloadName: string;
  hasAppVariableSpecified: boolean;
  appVariable?: string;
  workloadType: StpWorkloadType;
}) => {
  const languageSpecificConfig: PyLanguageSpecificConfig = packaging.properties
    .languageSpecificConfig as PyLanguageSpecificConfig;
  if (packaging.type === 'stacktape-lambda-buildpack' && languageSpecificConfig?.runAppAs) {
    throw stpErrors.e1002({ workloadName, workloadType });
  }
  if (!hasAppVariableSpecified && languageSpecificConfig?.runAppAs) {
    throw stpErrors.e1001({ entryfilePath: packaging.properties.entryfilePath, workloadName, workloadType });
  }
  if (hasAppVariableSpecified && !languageSpecificConfig?.runAppAs) {
    throw stpErrors.e91({ workloadName, workloadType, appVariable });
  }
};

export const validateAwsCdkConstructProps = ({ construct }: { construct: StpAwsCdkConstruct }) => {
  const prettyIdentifier = `${capitalizeFirstLetter('aws-cdk-construct')} ${tuiManager.makeBold(construct.name)}`;
  const cwdHint = `The path is resolved relative to the directory specified using ${tuiManager.prettyOption(
    'currentWorkingDirectory'
  )} or the directory containing Stacktape configuration file.`;

  const { entryfilePath } = construct;
  const { extension, filePath } = parseUserCodeFilepath({
    codeType: `${prettyIdentifier} entryfilePath`,
    fullPath: entryfilePath,
    workingDir: globalStateManager.workingDir
  });
  if (!supportedAwsCdkConstructExtensions.includes(extension as SupportedFileExt)) {
    throw new ExpectedError(
      'NOT_YET_IMPLEMENTED',
      `Packaging ${tuiManager.makeBold(`.${extension}`)} constructs is not yet supported.`
    );
  }
  if (!isFileAccessible(filePath)) {
    throw new ExpectedError(
      'CONFIG',
      `${prettyIdentifier}'s entryfilePath ${filePath} doesn't exist or is not accessible.`,
      cwdHint
    );
  }
};

const extractError = ({
  error,
  parentError
}: {
  error: Partial<ErrorObject & { mergedFrom: ErrorObject[] }>;
  parentError?: ErrorObject;
}): string => {
  // const basePrefix = parentError ? '-> ' : BASE_PATH_PREFIX;
  const instancePath = (
    parentError ? error.instancePath.slice(parentError.instancePath.length + 1) : error.instancePath
  ).replaceAll('/', '.');

  const fullPrefix = parentError
    ? !instancePath
      ? ''
      : `"${instancePath}" - `
    : `${BASE_PATH_PREFIX}${instancePath} - `;
  // if (instancePathSplit.length > 2 && instancePathSplit[1] === 'resources') {
  //   instancePath = `.${instancePathSplit[1]}.${tuiManager.colorize('cyan', instancePathSplit[2])}${
  //     instancePathSplit.length > 3 ? `.${instancePathSplit.slice(3).join('.')}` : ''
  //   }`;
  // } else {
  //   instancePath = instancePathSplit.join('.');
  // }

  switch (error.keyword) {
    case 'type': {
      const allowedTypes = (error.params as any).type || [];
      let msg: string;
      if (allowedTypes.length > 1) {
        msg = `must be one of type: ${allowedTypes.map((t: any) => tuiManager.makeBold(t)).join(', ')}. Received: "${error.data}".`;
      } else if (allowedTypes.length === 1) {
        msg = `must be of type ${tuiManager.makeBold(allowedTypes[0])}.`;
      } else {
        msg = 'has an invalid type.'; // Fallback message if array is empty
      }
      return `${fullPrefix}${msg}`;
    }
    case 'additionalProperties': {
      const unexpectedProps = (error.params as any).additionalProperty || [];

      let msg: string;
      if (unexpectedProps.length > 1) {
        msg = `contains ${tuiManager.makeBold('INVALID')} properties "${unexpectedProps.map((p: any) => tuiManager.makeBold(p)).join('", "')}".`;
      } else if (unexpectedProps.length === 1) {
        msg = `contains ${tuiManager.makeBold('INVALID')} property "${tuiManager.makeBold(unexpectedProps[0])}".`;
      } else {
        msg = 'contains unexpected properties.'; // Fallback
      }
      return `${fullPrefix}${msg} ${
        error.mergedFrom?.[0]?.parentSchema?.properties
          ? `\n    ${tuiManager.colorize('cyan', 'Valid properties are:')} "${Object.keys(
              error.mergedFrom[0].parentSchema.properties
            )
              .sort()
              .map((p: string) => tuiManager.makeBold(p))
              .join('", "')}".`
          : ''
      }`;
    }
    case 'enum': {
      const allowedValues = (error.params as any).allowedValues || [];
      let msg: string;
      if (allowedValues.length > 0) {
        msg = `value must be one of: ${allowedValues
          .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))))
          .map((t: any) => tuiManager.makeBold(t))
          .join(', ')}.`;
      } else {
        msg = 'value is not one of the allowed options.'; // Fallback
      }
      return `${fullPrefix}${msg}`;
    }
    case 'required': {
      const missingProps = (error.params as any).missingProperty || [];
      let msg: string;
      if (missingProps.length > 1) {
        msg = `missing ${tuiManager.makeBold('REQUIRED')} properties "${missingProps.map((p: any) => tuiManager.makeBold(p)).join('", "')}".`;
      } else if (missingProps.length === 1) {
        msg = `missing ${tuiManager.makeBold('REQUIRED')} property "${tuiManager.makeBold(missingProps[0])}".`;
      } else {
        msg = 'is missing required properties.'; // Fallback
      }
      return `${fullPrefix}${msg}`;
    }
    // case 'anyOf': {
    //   // anyOf has a different structure, return directly
    //   const sectionName = instancePath.split('.').at(-1);
    //   const pathPrefix = instancePath.split('.').slice(0, -1).join('.');
    //   return `${basePrefix}${pathPrefix} - ${tuiManager.makeBold(sectionName)} section is invalid.`;
    // }
    case 'const': {
      const constValues = (error.params as any).allowedValue || [];
      let msg: string;
      if (constValues.length > 1) {
        msg = `should be set to one of: ${constValues
          .sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))))
          .map((v: any) => tuiManager.makeBold(v))
          .join(', ')}.`;
      } else if (constValues.length === 1) {
        msg = `should be set to ${tuiManager.makeBold(constValues[0])}.`;
      } else {
        msg = 'does not match the required constant value(s).'; // Fallback
      }
      return splitStringIntoLines(`${fullPrefix}${msg}`, 150, 10).join('\n');
    }
    default: {
      console.error(JSON.stringify(error, null, 2));
      throw new UnexpectedError({
        customMessage: `Unhandled validation error keyword '${error.keyword}': ${JSON.stringify(error, null, 2)}, parent error: ${
          parentError && JSON.stringify(parentError, null, 2)
        }`
      });
    }
  }
};

const isNestedEnumSchema = (node: any): boolean => {
  return typeof node === 'object' && node.enum && (node.type === 'string' || node.type === 'number');
};

const getPossibleSchemasReachableFromRootDefinition = ({ rootDefinitionName }: { rootDefinitionName: string }) => {
  const toBeProcessed = [rootDefinitionName];
  const processedDefinitions: Set<string> = new Set();
  const possibleSchemas: { [definitionName: string]: any } = {};
  while (toBeProcessed.length) {
    const defNameToProcess = toBeProcessed.pop();
    if (processedDefinitions.has(defNameToProcess)) {
      continue;
    }
    const schemaToProcess = configSchema.definitions[defNameToProcess];
    processAllNodesSync(schemaToProcess, (node) => {
      if (typeof node === 'string' && node.startsWith('#/definitions/')) {
        const defName = node.split('/')[2];
        if (!processedDefinitions.has(defName) && !toBeProcessed.includes(defName)) {
          // if (rootDefinitionName === 'LambdaFunction') {
          //   console.log(defNameToProcess, 'adding to be processed', node.split('/')[2]);
          // }
          toBeProcessed.push(defName);
        }
      }
    });
    Object.entries(schemaToProcess.properties || {}).forEach(([key, propertyNode]: [string, any]) => {
      if (isNestedEnumSchema(propertyNode)) {
        possibleSchemas[`${defNameToProcess}.${key}`] = propertyNode;
      }
    });
    possibleSchemas[defNameToProcess] = schemaToProcess;
    processedDefinitions.add(defNameToProcess);
  }
  return possibleSchemas;
};

const extractInformationFromAnyOfError = ({ error }: { error: ErrorObject }) => {
  const allowedUnionMembers: SchemaUnionMember[] = [];
  let isWellDefinedUnion = true;

  (error.schema as any[]).forEach((unionMember: { $ref: string }) => {
    if (unionMember?.$ref?.startsWith('#/definitions/')) {
      const [, , definitionName] = unionMember.$ref.split('/');
      const definition = configSchema.definitions[definitionName];
      const isWellDefinedUnionMember = Boolean(
        Object.keys(definition.properties || {}).length <= 3 &&
          definition.properties?.properties?.$ref &&
          (definition.properties.type?.enum || definition.properties.type?.const)
      );
      let internalPropsDefinitionName: string;
      let internalPropsDefinition: any;
      if (isWellDefinedUnionMember) {
        [, , internalPropsDefinitionName] = definition.properties.properties.$ref.split('/');
        internalPropsDefinition = configSchema.definitions[internalPropsDefinitionName];
      }
      allowedUnionMembers.push({
        matchingTypes:
          isWellDefinedUnionMember && (definition.properties.type.enum || [definition.properties.type.const]),
        schemaDefinitionName: definitionName,
        schemaDefinition: definition,
        internalPropertiesSchemaDefinitionName: internalPropsDefinitionName,
        internalPropertiesSchemaDefinition: internalPropsDefinition,
        reachableSchemas: Object.values(
          getPossibleSchemasReachableFromRootDefinition({
            rootDefinitionName: definitionName
          })
        )
      });
      isWellDefinedUnion = isWellDefinedUnion && isWellDefinedUnionMember;
    }
    isWellDefinedUnion = false;
  });

  const chosenValidUnionMember =
    isWellDefinedUnion &&
    allowedUnionMembers.find(({ matchingTypes }) => matchingTypes.includes((error.data as any)?.type));
  return { isWellDefinedUnion, chosenValidUnionMember, allowedUnionMembers };
};

const groupErrorsPerUnionMember = ({
  allowedUnionMembers,
  errors
}: {
  allowedUnionMembers: SchemaUnionMember[];
  errors: ErrorObject[];
}) => {
  const grouped: { [unionMemberSchemaName: string]: ErrorObject[] } = {};
  const nonGrouped: ErrorObject[] = [];
  allowedUnionMembers.forEach(({ schemaDefinitionName }) => {
    grouped[schemaDefinitionName] = [];
  });

  errors.forEach((error) => {
    // const [, , definitionThatCaughtThisError] = error.schemaPath.split('/');
    const matchingSchemaMember = allowedUnionMembers.find((chosenValidUnionMember) =>
      isErrorRelevantForUnionMember({ chosenValidUnionMember, inspectedError: error })
    );
    if (matchingSchemaMember) {
      grouped[matchingSchemaMember.schemaDefinitionName].push(error);
    } else {
      nonGrouped.push(error);
    }
  });

  return { grouped, nonGrouped };
};

const isInvalidWellDefinedUnionMemberError = ({
  inspectedError,
  parentError
}: {
  inspectedError: ErrorObject;
  parentError: ErrorObject;
}) => {
  const { keyword, instancePath } = inspectedError;
  if (inspectedError.instancePath === parentError.instancePath) {
    return true;
  }
  if ((keyword === 'enum' || keyword === 'const') && instancePath === `${parentError.instancePath}/type`) {
    return true;
  }

  return false;
};

const isErrorRelevantForUnionMember = ({
  chosenValidUnionMember,
  inspectedError,
  parentError
}: {
  chosenValidUnionMember: SchemaUnionMember;
  inspectedError: ErrorObject;
  parentError?: ErrorObject;
}) => {
  const { keyword, parentSchema, instancePath } = inspectedError;

  // if this is the "type" error, but we already know that we are dealing with a well defined union member, we can ignore it
  if (keyword === 'const' && instancePath === `${parentError?.instancePath}/type`) {
    return false;
  }

  const errorParentSchemaIsContainedInOneOfTheReachableSchemas = chosenValidUnionMember.reachableSchemas.some(
    (schema) => {
      return JSON.stringify(schema).includes(JSON.stringify(parentSchema));
    }
  );
  if (errorParentSchemaIsContainedInOneOfTheReachableSchemas) {
    return true;
  }

  return false;
};

const getErrorLines = ({
  errorsToPrint,
  parentError
}: {
  errorsToPrint: ErrorObject[];
  parentError: ErrorObject;
}): string[] => {
  let errIndex = 0;

  const preparedErrorMessages = prepareErrorMessages({ errors: errorsToPrint, parentError });

  // we do not apply numbering if there is only one message, because it will be printed as a single line with parent error
  return preparedErrorMessages.length === 1
    ? preparedErrorMessages
    : preparedErrorMessages
        .sort()
        .map((errMsg) => `${tuiManager.colorize('red', `${++errIndex}.`.padEnd(3, ' '))} ${errMsg}`);
};

const getBadlyDefinedUnionErrorLines = ({
  groupedErrors,
  nonGroupedErrors,
  parentError
}: {
  groupedErrors: { [schemaDefinitionName: string]: ErrorObject[] };
  nonGroupedErrors: ErrorObject[];
  parentError: ErrorObject;
}): string[] => {
  const errorLines: string[] = [];
  let errIndex = 0;
  Object.entries(groupedErrors).forEach(([schemaDefinitionName, errors]) => {
    errorLines.push(
      `${tuiManager.colorize('red', `${++errIndex}.`)} If you are trying to use ${tuiManager.colorize(
        'red',
        schemaDefinitionName
      )}:`
    );
    prepareErrorMessages({ errors, parentError })
      .sort()
      .forEach((errMsg) => {
        errorLines.push(`${tuiManager.colorize('red', '  -')} ${errMsg}`);
      });
  });
  prepareErrorMessages({ errors: nonGroupedErrors, parentError })
    .sort()
    .forEach((errMsg) => {
      errorLines.push(`${tuiManager.colorize('red', `${++errIndex}.`)} ${errMsg}`);
    });
  return errorLines;
};

const mergeSimilarErrors = (errors: ErrorObject[]): Partial<ErrorObject & { mergedFrom: ErrorObject[] }>[] => {
  // Group errors by key (instancePath#keyword)
  const groupedErrors = new Map<string, ErrorObject[]>();

  errors.forEach((err) => {
    const key = `${err.instancePath}#${err.keyword}`;
    const group = groupedErrors.get(key);
    if (group) {
      group.push(err);
    } else {
      groupedErrors.set(key, [err]);
    }
  });

  // Merge each group into a single representative error object
  const mergedErrors: Partial<ErrorObject & { mergedFrom: ErrorObject[] }>[] = [];

  groupedErrors.forEach((originalErrors) => {
    if (!originalErrors.length) {
      return;
    }

    const firstError = originalErrors[0];
    const mergedParams: Record<string, any> = {};

    // Collect all params from all errors in the group, grouped by key
    const collectedParams: Record<string, any[]> = {};
    originalErrors.forEach((error) => {
      const currentParams = (error.params as Record<string, any>) || {};
      for (const key in currentParams) {
        if (!collectedParams[key]) {
          collectedParams[key] = [];
        }
        collectedParams[key].push(currentParams[key]);
      }
    });

    // Process collected params: merge everything into a deduplicated array
    for (const key in collectedParams) {
      const allValues = collectedParams[key];
      // Flatten all collected values for the key and deduplicate
      mergedParams[key] = [...new Set(allValues.flat())];
    }

    mergedErrors.push({
      keyword: firstError.keyword,
      instancePath: firstError.instancePath,
      params: mergedParams,
      mergedFrom: originalErrors // Keep track of all original errors merged into this one
    });
  });

  return mergedErrors;
};

const prepareErrorMessages = ({ errors, parentError }: { errors: ErrorObject[]; parentError?: ErrorObject }) => {
  return (
    mergeSimilarErrors(errors || [])
      .map((err) => {
        return extractError({ error: err, parentError });
      })
      .sort()
      // remove duplicates
      .filter((errMessage, index, arr) => errMessage !== arr[index + 1])
  );
  // .filter((errMessage, index, arr) => errMessage.length > 0);
};

const isIrrelevantResourceError = ({ error, config }: { error: ErrorObject; config: StacktapeConfig }) => {
  const isErrorOnResource = error.instancePath.startsWith('/resources/');
  // if the error is not on a resource, we cannot determine if it is relevant, thus making it relevant
  if (!isErrorOnResource) {
    return false;
  }
  const resourceFromConfig = config.resources[error.instancePath.split('/').at(2)];
  const availableResourceSchemaNames = configSchema.definitions.StacktapeResourceDefinition.anyOf.map(({ $ref }) =>
    $ref.split('/').at(2)
  );
  const resourceSchemaName = availableResourceSchemaNames.find(
    (schemaName) => configSchema.definitions[schemaName].properties.type.const === resourceFromConfig?.type
  );
  // if we did not find a schema for the resource based on the resource type, we cannot determine if the error is relevant, thus making it relevant
  if (!resourceSchemaName) {
    return false;
  }
  // if we have schema, then any kind of resource type error is irrelevant
  const errorInstancePathSplit = error.instancePath.split('/');
  const isResourceTypeError = errorInstancePathSplit.length === 4 && errorInstancePathSplit.at(3) === 'type';
  if (isResourceTypeError) {
    return true;
  }
  const reachableSchemas = getPossibleSchemasReachableFromRootDefinition({
    rootDefinitionName: resourceSchemaName
  });
  if (error.keyword === 'anyOf') {
    // if it is a top level anyOf, we will accept even though not all schemas are reachable
    if (errorInstancePathSplit.length === 3) {
      return false;
    }
    // otherwise we will accept only if all schemas are reachable, because that way we know that error deals with schemas relevant to resource type.
    return !(error.schema as Array<{ $ref: string }>).every(
      ({ $ref }) => $ref && $ref.split('/').at(2) in reachableSchemas
    );
  }
  return !Object.values(reachableSchemas).find((schema) => {
    return JSON.stringify(schema).includes(JSON.stringify(error.parentSchema));
  });
};

const getCumulatedErrorsGroupedByAnyOfParent = ({
  validatorErrors
}: {
  validatorErrors: ErrorObject[];
}): {
  [instancePath: string]: {
    errorLines: string[];
    error: ErrorObject;
    chosenValidUnionMember?: SchemaUnionMember;
    instancePath: string;
  };
} => {
  // Separate anyOf errors from others
  const allAnyOfErrors = validatorErrors.filter((err) => err.keyword === 'anyOf');
  // Sort the anyOf errors by instancePath (alphabetical, shortest first)
  allAnyOfErrors.sort((errorA, errorB) => errorA.instancePath.localeCompare(errorB.instancePath));

  const otherErrors = validatorErrors.filter((err) => err.keyword !== 'anyOf');

  // Initialize map to hold anyOf errors and their assigned children
  const anyOfErrorsWithAssignedErrors: {
    [anyOfErrorInstancePath: string]: {
      error: ErrorObject;
      assignedErrors: ErrorObject[];
    };
  } = {};

  // Initialize map with all anyOf errors
  allAnyOfErrors.forEach((anyOfError) => {
    anyOfErrorsWithAssignedErrors[anyOfError.instancePath] = {
      error: anyOfError,
      assignedErrors: []
    };
  });

  // Assign other errors to their closest anyOf parent based on longest instancePath prefix
  otherErrors.forEach((error) => {
    let bestMatch: ErrorObject | null = null;
    let maxMatchLength = -1;

    // Find the anyOfError with the longest instancePath that is a prefix of the current error's instancePath
    allAnyOfErrors.forEach((anyOfError) => {
      if (error.instancePath.startsWith(anyOfError.instancePath)) {
        if (anyOfError.instancePath.length > maxMatchLength) {
          maxMatchLength = anyOfError.instancePath.length;
          bestMatch = anyOfError;
        }
      }
    });

    // If a match was found, assign the error to that anyOfError's list
    if (bestMatch) {
      // The map entry is guaranteed to exist due to the initialization loop above
      anyOfErrorsWithAssignedErrors[bestMatch.instancePath].assignedErrors.push(error);
    }
    // Errors that don't match any anyOf parent are currently ignored. Add handling here if needed.
  });

  // Process each anyOf error group (the anyOf error + its assigned children)
  return Object.values(anyOfErrorsWithAssignedErrors).reduce(
    (acc, { error, assignedErrors }) => {
      const instancePath = replaceAll('/', '.', error.instancePath);
      let errorLines: string[] = [];

      // Use the errors assigned in the previous step as the relevant errors for this anyOf group
      const relevantErrorsOnSamePath = assignedErrors;

      const { isWellDefinedUnion, chosenValidUnionMember, allowedUnionMembers } = extractInformationFromAnyOfError({
        error
      });

      if (isWellDefinedUnion) {
        let errorsRelatedToChosenUnionMember: ErrorObject[];
        if (chosenValidUnionMember) {
          // Filter assigned errors based on relevance to the specific union member identified
          errorsRelatedToChosenUnionMember = relevantErrorsOnSamePath.filter((inspectedError) => {
            return isErrorRelevantForUnionMember({
              chosenValidUnionMember,
              inspectedError,
              parentError: error
            });
          });
        }
        // Filter assigned errors that indicate the union member choice itself was invalid (e.g., wrong 'type')
        const invalidUnionMemberErrors = relevantErrorsOnSamePath.filter((inspectedError) =>
          isInvalidWellDefinedUnionMemberError({ inspectedError, parentError: error })
        );

        // Prioritize showing errors specific to the chosen member's properties.
        // If none exist, show errors indicating the choice itself was wrong.
        errorLines = getErrorLines({
          errorsToPrint: errorsRelatedToChosenUnionMember?.length
            ? errorsRelatedToChosenUnionMember
            : invalidUnionMemberErrors,
          parentError: error
        });
      } else {
        // Handle cases where the union type isn't clearly determined by a 'type' property
        const { grouped, nonGrouped } = groupErrorsPerUnionMember({
          allowedUnionMembers,
          errors: relevantErrorsOnSamePath // Group the assigned errors
        });
        errorLines = getBadlyDefinedUnionErrorLines({
          groupedErrors: grouped,
          nonGroupedErrors: nonGrouped,
          parentError: error
        });
      }

      // Assign the processed error details to the accumulator object
      // Key: instancePath
      // Value: { errorLines, error, chosenValidUnionMember, instancePath }
      acc[instancePath] = { errorLines, error, chosenValidUnionMember, instancePath };
      return acc;
    },
    {} as {
      // Initial value for the accumulator
      [instancePath: string]: {
        errorLines: string[];
        error: ErrorObject;
        chosenValidUnionMember?: SchemaUnionMember;
        instancePath: string;
      };
    }
  );
};

const BASE_PATH_PREFIX = '{config}';

export const validateConfigStructure = async ({
  config,
  configPath,
  templateId
}: {
  config: StacktapeConfig;
  configPath: string;
  templateId: string;
}) => {
  // Use Zod validator for better error messages (especially for discriminated unions)
  const zodResult = validateConfigWithZod({ config, configPath, templateId });
  if (!zodResult.valid && 'errorMessage' in zodResult) {
    throw new ExpectedError('CONFIG_VALIDATION', zodResult.errorMessage);
  }
};

export const validateResourceNameUniqueness = () => {
  const resourceNames = configManager.allConfigResources.map(({ name }) => name);
  const duplicates = getUniqueDuplicates(resourceNames);
  if (duplicates.length) {
    throw new ExpectedError(
      'CONFIG_VALIDATION',
      `Workload names must be unique across whole service. Duplicates: ${duplicates.join(', ')}.`
    );
  }
};

export const validateResourceNames = () => {
  configManager.allConfigResources.forEach(({ name }) => {
    if (!isAlphanumeric(name)) {
      throw new ExpectedError(
        'CONFIG_VALIDATION',
        `Resource name "${name}" is not valid. Each resource name must be alphanumeric.`
      );
    }
  });
};

export const validateGuardrails = (guardrails: GuardrailDefinition[]) => {
  for (const guardrail of guardrails || []) {
    switch (guardrail.type) {
      case 'stage-restriction': {
        const { allowedStages } = guardrail.properties;
        if (!allowedStages.includes(globalStateManager.targetStack.stage)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Stage ${globalStateManager.targetStack.stage} is not allowed. Allowed stages: ${allowedStages.join(', ')}.`
          );
        }
        break;
      }
      case 'region-restriction': {
        const { allowedRegions } = guardrail.properties;
        if (!allowedRegions.includes(globalStateManager.region)) {
          throw new ExpectedError(
            'GUARDRAIL',
            `Region ${globalStateManager.region} is not allowed. Allowed regions: ${allowedRegions.join(', ')}.`
          );
        }
        break;
      }
    }
  }
};

// const validateProviders = () => {
//   if (configManager.atlasMongoClusters.length && !configManager.mongoDbAtlasProvider) {
//     throw new ExpectedError(
//       'CONFIG_VALIDATION',
//       'Error in config. If you want to use atlas-mongo-cluster resources, you need to define "providerConfig.mongoDbAtlas" section in your config.'
//     );
//   }
//   if (
//     (configManager.upstashKafkaTopics.length || configManager.upstashRedisDatabases.length) &&
//     !configManager.upstashProvider
//   ) {
//     throw stpErrors.e21(null);
//   }
// };

const validateBastionReferences = () => {
  [
    ...Object.values(configManager.scripts)
    // ...(Object.values(configManager.hooks) as InlineScriptLifecycleHook[][]).flat()
  ]
    .filter(({ type }) => type === 'bastion-script' || type === 'local-script-with-bastion-tunneling')
    .forEach(({ type, properties: { bastionResource } }: BastionScript | LocalScriptWithBastionTunneling) => {
      if (bastionResource) {
        resolveReferenceToBastion({ referencedFrom: type, stpResourceReference: bastionResource });
      } else if (!configManager.bastions.length) {
        throw stpErrors.e94({ scriptType: type });
      }
    });
};

export const validateReuseVpcConfig = () => {
  const reuseVpc = configManager.config?.stackConfig?.vpc?.reuseVpc;

  if (!reuseVpc) {
    return; // No validation needed if not using reuseVpc
  }

  const hasVpcId = Boolean(reuseVpc.vpcId);
  const hasProjectStage = Boolean(reuseVpc.projectName && reuseVpc.stage);

  // XOR validation: exactly one method must be specified
  if (hasVpcId === hasProjectStage) {
    throw stpErrors.e132(null);
  }

  // If using projectName/stage, both must be present
  if (!hasVpcId && (!reuseVpc.projectName || !reuseVpc.stage)) {
    throw stpErrors.e132(null);
  }
};

// these are only static validations that can be ran after the initial resolving of the config
// however there are some validations that can only be performed after domain services are initialized
// for example validating domain usability etc - those validation are mostly executed as a part of resource resolvers
export const runInitialValidations = () => {
  validateResourceNameUniqueness();
  validateResourceNames();
  validateReuseVpcConfig();
  // validateProviders();
  validateBastionReferences();
  // packaging props
  configManager.allContainerWorkloadContainers.forEach((props) =>
    validatePackagingProps({
      ...props,
      containerName: props.name
    })
  );
  configManager.allBatchJobContainers.forEach((props) =>
    validatePackagingProps({
      ...props
    })
  );
  configManager.allUserCodeLambdas.forEach((props) =>
    validatePackagingProps({
      ...props,
      workloadType: props.type,
      workloadName: props.name,
      lambdaRuntime: props.runtime
    })
  );
  configManager.awsCdkConstructs.forEach((construct) => {
    validateAwsCdkConstructProps({ construct });
  });
  // http-api-gateway
  configManager.allHttpApiGateways.forEach((resource) => {
    validateHttpApiGatewayConfig({ resource });
  });
  // application-load-balancer
  configManager.applicationLoadBalancers.forEach((definition) => {
    validateApplicationLoadBalancerConfig({ definition });
  });
  // network-load-balancer
  configManager.networkLoadBalancers.forEach((definition) => {
    validateNetworkLoadBalancerConfig({ definition });
  });
  // buckets
  configManager.allBuckets.forEach((definition) => {
    validateBucketConfig({ definition });
  });
  // relational databases
  configManager.databases.forEach((definition) => {
    validateRelationalDatabaseConfig({ resource: definition });
  });
  // web services
  configManager.webServices.forEach((resource) => {
    validateWebServiceConfig({ resource });
  });
  // multi container workload
  configManager.allContainerWorkloads.forEach((definition) => {
    validateMultiContainerWorkloadConfig({ definition });
  });
  // sns topics
  configManager.snsTopics.forEach((resource) => {
    validateSnsTopicConfig({ resource });
  });
  // sqs queues
  configManager.sqsQueues.forEach((resource) => {
    validateSqsQueueConfig({ resource });
  });
  // nextjs-webs
  configManager.nextjsWebs.forEach((resource) => {
    validateNextjsWebConfig({ resource });
  });
  // lambdas
  configManager.functions.forEach((resource) => {
    validateLambdaConfig({ definition: resource });
  });
  // buckets
  configManager.buckets.forEach((resource) => {
    validateBucketConfig({ definition: resource });
  });
};
