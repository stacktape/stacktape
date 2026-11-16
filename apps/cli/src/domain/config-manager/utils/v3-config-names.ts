/**
 * Names that Stacktape v3 configs use and v4 rejects, with what replaces each. Validation and TypeScript config loading
 * add these to their errors, so a v3 config tells its author what to change instead of only listing the valid v4 names.
 */
export const UPGRADING_FROM_V3_URL = 'https://docs.stacktape.com/getting-started/upgrading-from-v3/';

const languageSpecificConfigMove = 'move the options under `languageSpecificConfig` up one level';

/** v3 `packaging.type` values. */
const V3_PACKAGING_TYPES: Record<string, string> = {
  'custom-dockerfile': 'use `dockerfile`; its properties are unchanged',
  'stacktape-lambda-buildpack': `use \`js-bundle\` for a JavaScript or TypeScript entry file and ${languageSpecificConfigMove}, or \`buildpack\` for other languages and rename \`languageSpecificConfig\` to \`python\`, \`java\` or \`dotnet\``,
  'stacktape-image-buildpack': `use \`js-bundle\` for a JavaScript or TypeScript entry file and ${languageSpecificConfigMove}, or \`buildpack\` for other languages`,
  nixpacks: 'use `buildpack`, and rename `startCmd` to `startCommand`',
  'external-buildpack': 'use `buildpack`, or `dockerfile` if you depend on a specific builder'
};

/** v3 property names, keyed by the last segment of the path that holds them. */
const V3_PROPERTIES: Record<string, string> = {
  notificationTargets: 'Rename it to `notificationChannels`; the destinations inside it are unchanged',
  languageSpecificConfig:
    'For `js-bundle`, move its options up one level, into the packaging `properties`. For a Lambda `buildpack`, rename it to `python`, `java` or `dotnet`',
  disableAutoRollback: 'Delete it: v4 does not roll back a failed deployment unless `autoRollback: true` is set',
  serviceName: 'Rename it to `projectName`, keeping the value, so the config still targets the deployed stacks',
  startCmd: 'Rename it to `startCommand`'
};

/** v3 exports of the `stacktape` npm package that v4 no longer has. */
const V3_EXPORTS: Record<string, string> = {
  CustomDockerfilePackaging: 'Use `DockerfilePackaging`',
  StacktapeLambdaBuildpackPackaging:
    'Use `JsBundleLambdaPackaging` for a JavaScript or TypeScript entry file, or `BuildpackLambdaPackaging` for other languages',
  StacktapeImageBuildpackPackaging:
    'Use `JsBundleImagePackaging` for a JavaScript or TypeScript entry file, or `BuildpackImagePackaging` for other languages',
  NixpacksPackaging: 'Use `BuildpackImagePackaging`',
  ExternalBuildpackPackaging:
    'Use `BuildpackImagePackaging`, or `DockerfilePackaging` if you depend on a specific builder',
  RedisCluster: 'Use `Redis`',
  AuroraServerlessEngineMysql:
    'AWS retired Aurora Serverless v1. Use `AuroraServerlessV2EngineMysql` for a new database; a deployed v1 database needs a planned migration',
  AuroraServerlessEnginePostgresql:
    'AWS retired Aurora Serverless v1. Use `AuroraServerlessV2EnginePostgresql` for a new database; a deployed v1 database needs a planned migration',
  AWS_SES: 'Declare an `EmailSender` resource for your verified identity and list it in `connectTo`'
};

/** Aurora Serverless v1 engine types, which AWS retired on 31 March 2025, with their v2 replacements. */
export const AURORA_SERVERLESS_V1_ENGINES: Record<string, string> = {
  'aurora-mysql-serverless': 'aurora-mysql-serverless-v2',
  'aurora-postgresql-serverless': 'aurora-postgresql-serverless-v2'
};

export const AURORA_SERVERLESS_V1_GUIDE_URL = `${UPGRADING_FROM_V3_URL}#aurora-serverless-v1`;

const withGuide = (text: string) => `${text}. See ${UPGRADING_FROM_V3_URL}`;

export const v3PackagingTypeHint = (type: string): string | undefined => {
  const replacement = V3_PACKAGING_TYPES[type];
  return replacement && withGuide(`\`${type}\` is a Stacktape v3 packaging type: ${replacement}`);
};

export const v3PropertyHint = (property: string): string | undefined => {
  const replacement = V3_PROPERTIES[property];
  return replacement && withGuide(`\`${property}\` is a Stacktape v3 property. ${replacement}`);
};

/** The removed v3 exports a config's source mentions, so one error can list every import to change. */
export const v3ExportsMentionedIn = (source: string): string[] =>
  Object.keys(V3_EXPORTS).filter((exportName) => new RegExp(`\\b${exportName}\\b`).test(source));

export const v3ExportHint = (exportName: string): string | undefined => {
  const replacement = V3_EXPORTS[exportName];
  return replacement && withGuide(`\`${exportName}\` was removed in Stacktape v4. ${replacement}`);
};
