import type { StpAppSyncApi } from '@domain-services/config-manager/resolved-types/appsync-apis';
import type { StpLambdaFunction } from '@domain-services/config-manager/resolved-types/functions';
import type { StpWorkloadType } from '@domain-services/config-manager/resolved-types/resources';
import type { AppSyncApiIntegration } from '@stacktape/config/events';
import { CliError } from '@utils/errors';
import { Kind, parse, type DocumentNode } from 'graphql';
import { isAbsolute, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { getPropsOfResourceReferencedInConfig, type ResourceLookup } from './resource-lookup';

const MAX_SCHEMA_BYTES = 1024 * 1024;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const GRAPHQL_FIELD_REFERENCE = /^([_A-Za-z][_0-9A-Za-z]*)\.([_A-Za-z][_0-9A-Za-z]*)$/;
const RFC_3339_TIMESTAMP = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/;

type AppSyncValidationContext = ResourceLookup & {
  functions: readonly StpLambdaFunction[];
};

export const resolveReferenceToAppSyncApi = ({
  activeConfig,
  referencedFrom,
  referencedFromType,
  stpResourceReference
}: {
  activeConfig: ResourceLookup;
  referencedFrom: string;
  referencedFromType?: StpWorkloadType;
  stpResourceReference: string;
}) =>
  getPropsOfResourceReferencedInConfig({
    activeConfig,
    stpResourceReference,
    stpResourceType: 'appsync-api',
    referencedFrom,
    referencedFromType
  });

export const getAllIntegrationsForAppSyncApi = ({
  activeConfig,
  resource
}: {
  activeConfig: Pick<AppSyncValidationContext, 'functions'>;
  resource: StpAppSyncApi;
}): (AppSyncApiIntegration & { workloadName: string })[] =>
  activeConfig.functions.flatMap(({ events, name }) =>
    (events || [])
      .filter(
        (event): event is AppSyncApiIntegration =>
          event.type === 'appsync-api' && event.properties.appsyncApiName === resource.nameChain.join('.')
      )
      .map((event) => ({ ...event, workloadName: name }))
  );

export const readAppSyncSchema = ({ resource, workingDir }: { resource: StpAppSyncApi; workingDir: string }) => {
  const configuredPath = resource.schemaFilePath.trim();
  const schemaPath = isAbsolute(configuredPath) ? configuredPath : join(workingDir, configuredPath);
  let definition: string;
  try {
    definition = readFileSync(schemaPath, 'utf8');
  } catch (cause) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_SCHEMA_FILE_UNREADABLE',
      message: `AppSync API \`${resource.name}\` cannot read schema file \`${configuredPath}\`.`,
      hints: 'Create the file, or set `schemaFilePath` to a path relative to the Stacktape project directory.',
      cause
    });
  }
  if (Buffer.byteLength(definition, 'utf8') > MAX_SCHEMA_BYTES) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_SCHEMA_TOO_LARGE',
      message: `AppSync API \`${resource.name}\` schema exceeds the 1 MiB inline-schema limit.`,
      hints: 'Reduce the schema size before deployment.'
    });
  }
  return { definition, schemaPath };
};

const parseSchema = ({ definition, resource }: { definition: string; resource: StpAppSyncApi }): DocumentNode => {
  try {
    return parse(definition);
  } catch (cause) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_SCHEMA_SYNTAX_INVALID',
      message: `AppSync API \`${resource.name}\` has invalid GraphQL schema syntax.`,
      hints: cause instanceof Error ? cause.message : String(cause),
      cause
    });
  }
};

const getObjectFields = (document: DocumentNode) => {
  const result = new Set<string>();
  document.definitions.forEach((definition) => {
    if (definition.kind !== Kind.OBJECT_TYPE_DEFINITION && definition.kind !== Kind.OBJECT_TYPE_EXTENSION) {
      return;
    }
    definition.fields?.forEach((field) => result.add(`${definition.name.value}.${field.name.value}`));
  });
  return result;
};

const validateApiKeyExpiry = ({ expiresAt, now }: { expiresAt: string; now: Date }) => {
  const timestampParts = expiresAt.match(RFC_3339_TIMESTAMP);
  if (!timestampParts) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_API_KEY_EXPIRY_INVALID',
      message: `AppSync API key expiration \`${expiresAt}\` is not an absolute RFC 3339 timestamp.`,
      hints: 'Use a timestamp with a timezone, for example `2027-01-31T00:00:00Z`.'
    });
  }
  const [, yearPart, monthPart, dayPart, hourPart, minutePart, secondPart] = timestampParts;
  const year = Number(yearPart);
  const month = Number(monthPart);
  const day = Number(dayPart);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (
    !daysInMonth ||
    day < 1 ||
    day > daysInMonth ||
    Number(hourPart) > 23 ||
    Number(minutePart) > 59 ||
    Number(secondPart) > 59
  ) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_API_KEY_EXPIRY_INVALID',
      message: `AppSync API key expiration \`${expiresAt}\` is not a valid calendar date.`,
      hints: 'Use a real calendar date with a timezone, for example `2027-01-31T00:00:00Z`.'
    });
  }
  const expiration = Date.parse(expiresAt);
  if (!Number.isFinite(expiration)) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_API_KEY_EXPIRY_INVALID',
      message: `AppSync API key expiration \`${expiresAt}\` is not a valid date.`,
      hints: 'Use a real calendar date with a timezone, for example `2027-01-31T00:00:00Z`.'
    });
  }
  const lifetime = getAppSyncApiKeyExpirationSeconds(expiresAt) * 1000 - now.getTime();
  if (lifetime < DAY_MILLISECONDS || lifetime > 365 * DAY_MILLISECONDS) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_API_KEY_EXPIRY_OUT_OF_RANGE',
      message: 'AppSync API key expiration must be between 1 and 365 days in the future when deployed.',
      hints: 'Choose a fixed expiration timestamp in that window. Stacktape will not extend it automatically.'
    });
  }
};

export const getAppSyncApiKeyExpirationSeconds = (expiresAt: string) =>
  Math.floor(Date.parse(expiresAt) / 3600000) * 3600;

export const validateAppSyncApiConfig = ({
  activeConfig,
  now = new Date(),
  resource,
  workingDir
}: {
  activeConfig: AppSyncValidationContext;
  now?: Date;
  resource: StpAppSyncApi;
  workingDir: string;
}) => {
  if (!resource.schemaFilePath.trim()) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_SCHEMA_PATH_EMPTY',
      message: `AppSync API \`${resource.name}\` has an empty \`schemaFilePath\`.`,
      hints: 'Remove the property to use `schema.graphql`, or provide a project-relative file path.'
    });
  }
  if (resource.queryDepthLimit < 0 || resource.queryDepthLimit > 75) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_QUERY_DEPTH_LIMIT_INVALID',
      message: `AppSync API \`${resource.name}\` query depth limit must be between 0 and 75.`
    });
  }
  if (resource.resolverCountLimit < 0 || resource.resolverCountLimit > 10000) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_RESOLVER_COUNT_LIMIT_INVALID',
      message: `AppSync API \`${resource.name}\` resolver count limit must be between 0 and 10000.`
    });
  }
  if (resource.logging?.disabled && resource.logging.logForwarding) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_LOG_FORWARDING_WITH_LOGS_DISABLED',
      message: `AppSync API \`${resource.name}\` cannot forward logs while logging is disabled.`
    });
  }
  if (resource.logging?.logClass === 'infrequent-access' && resource.logging.logForwarding) {
    throw new CliError({
      category: 'CONFIG_VALIDATION',
      code: 'CONFIG_APPSYNC_IA_LOG_FORWARDING_UNSUPPORTED',
      message: `AppSync API \`${resource.name}\` cannot forward an Infrequent Access log group.`,
      hints: 'Use the default `standard` log class when log forwarding is required.'
    });
  }

  if (resource.authentication.type === 'user-auth-pool') {
    getPropsOfResourceReferencedInConfig({
      activeConfig,
      stpResourceReference: resource.authentication.properties.userAuthPoolName,
      stpResourceType: 'user-auth-pool',
      referencedFrom: resource.name,
      referencedFromType: resource.type
    });
  } else if (resource.authentication.type === 'api-key') {
    validateApiKeyExpiry({ expiresAt: resource.authentication.properties.expiresAt, now });
  }

  if (resource.customDomain?.customCertificateArn) {
    const [, , service, region] = resource.customDomain.customCertificateArn.split(':');
    if (service !== 'acm' || region !== 'us-east-1') {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_APPSYNC_CUSTOM_CERTIFICATE_REGION_INVALID',
        message: `AppSync custom domain \`${resource.customDomain.domainName}\` requires an ACM certificate from \`us-east-1\`.`,
        hints: 'Provide a `us-east-1` ACM certificate ARN, or omit it so Stacktape selects a managed certificate.'
      });
    }
  }

  const { definition } = readAppSyncSchema({ resource, workingDir });
  const fields = getObjectFields(parseSchema({ definition, resource }));
  getAllIntegrationsForAppSyncApi({ activeConfig, resource }).forEach(({ properties, workloadName }) => {
    if (!GRAPHQL_FIELD_REFERENCE.test(properties.field)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_APPSYNC_RESOLVER_FIELD_INVALID',
        message: `Function \`${workloadName}\` uses invalid AppSync field \`${properties.field}\`.`,
        hints: 'Use `Type.field`, for example `Query.user` or `Mutation.createOrder`.'
      });
    }
    if (!fields.has(properties.field)) {
      throw new CliError({
        category: 'CONFIG_VALIDATION',
        code: 'CONFIG_APPSYNC_RESOLVER_FIELD_MISSING',
        message: `Function \`${workloadName}\` targets AppSync field \`${properties.field}\`, but that field is not in the schema.`,
        hints: 'Add the object field to the GraphQL schema, or correct the event `field` value.'
      });
    }
  });
};

export const validateAppSyncIntegrations = ({ activeConfig }: { activeConfig: AppSyncValidationContext }) => {
  const owners = new Map<string, string>();
  activeConfig.functions.forEach(({ events, name: workloadName }) => {
    (events || [])
      .filter((event): event is AppSyncApiIntegration => event.type === 'appsync-api')
      .forEach(({ properties }) => {
        const api = resolveReferenceToAppSyncApi({
          activeConfig,
          referencedFrom: workloadName,
          referencedFromType: 'function',
          stpResourceReference: properties.appsyncApiName
        });
        const ownershipKey = `${api.nameChain.join('.')}:${properties.field}`;
        const previousOwner = owners.get(ownershipKey);
        if (previousOwner) {
          throw new CliError({
            category: 'CONFIG_VALIDATION',
            code: 'CONFIG_APPSYNC_RESOLVER_FIELD_CONFLICT',
            message: `AppSync field \`${properties.field}\` on API \`${api.name}\` is assigned to both \`${previousOwner}\` and \`${workloadName}\`.`,
            hints: 'Each AppSync field can have only one Lambda resolver.'
          });
        }
        owners.set(ownershipKey, workloadName);
      });
  });
};
