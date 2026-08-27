import { join } from 'node:path';

const DIST_FOLDER_NAME = '__stacktape-dist';
const SOURCE_FOLDER_NAME = 'src';
export const BRIDGE_FILES_FOLDER_NAME = 'bridge-files';
export const HELPER_LAMBDAS_FOLDER_NAME = 'helper-lambdas';
const JSON_SCHEMAS_FOLDER_NAME = 'schemas';
const SOURCE_MAP_INSTALL_FILENAME = 'source-map-install.js';
const CLI_RELEASE_FOLDER_NAME = '__release';
const SDK_RELEASE_FOLDER_NAME = '__release-npm';
export const STARTER_PROJECTS_METADATA_FOLDER_NAME = 'starter-projects-metadata.json';

export const DIST_FOLDER_PATH = join(process.cwd(), DIST_FOLDER_NAME);
export const DEV_TMP_FOLDER_PATH = join(process.cwd(), 'node_modules', '__dev-tmp');
export const DEV_ARTIFACTS_FOLDER_PATH = join(DIST_FOLDER_PATH, 'dev');
export const CLI_BUILD_DIST_FOLDER_PATH = join(process.cwd(), '__cli-dist', 'stacktape');
/** The built `init` wizard interface, which a release copies in beside the binary as `init-ui/`. */
export const INIT_WIZARD_BUNDLE_SOURCE_PATH = join(process.cwd(), '..', 'init-ui', 'dist');
export const DIST_PACKAGE_FOLDER_PATH = join(process.cwd(), '__dist');
export const CLI_RELEASE_FOLDER_PATH = join(process.cwd(), CLI_RELEASE_FOLDER_NAME);
export const NPM_RELEASE_FOLDER_PATH = join(process.cwd(), SDK_RELEASE_FOLDER_NAME);
export const PUBLISH_STARTER_PROJECTS_DIR_PATH = join(process.cwd(), '__publish-starters-repo-dir');
export const SOURCE_FOLDER_PATH = join(process.cwd(), 'src');
export const NPM_PACKAGE_JSON_SOURCE_PATH = join(process.cwd(), 'scripts', 'release', 'npm-package', 'package.json');
export const SOURCE_MAP_INSTALL_DIST_PATH = join(DIST_FOLDER_PATH, SOURCE_MAP_INSTALL_FILENAME);
/** Self-contained OTel runtime that packaging bundles into traced Lambda functions. */
export const LAMBDA_TRACING_RUNTIME_FILE_NAME = 'lambda-tracing-runtime.mjs';
export const LAMBDA_TRACING_RUNTIME_DIST_PATH = join(DIST_FOLDER_PATH, LAMBDA_TRACING_RUNTIME_FILE_NAME);
export const LAMBDA_TRACING_RUNTIME_SOURCE_PATH = join(
  process.cwd(),
  'src',
  'packaging-assets',
  'lambda-tracing-runtime',
  'index.ts'
);
export const STARTER_PROJECTS_SOURCE_PATH = join(process.cwd(), 'starter-projects');
export const GENERATED_STARTER_PROJECTS_DIR_PATH = join(process.cwd(), '__starter-projects');
export const SOURCE_MAP_INSTALL_FILE_NAME = 'source-map-install.js';
export const BRIDGE_FILES_SOURCE_FOLDER_PATH = join(SOURCE_FOLDER_NAME, 'utils', BRIDGE_FILES_FOLDER_NAME);
export const HELPER_LAMBDAS_DIST_FOLDER_PATH = join(DIST_FOLDER_PATH, HELPER_LAMBDAS_FOLDER_NAME);
export const HELPER_LAMBDAS_SOURCE_FOLDER_PATH = join(process.cwd(), HELPER_LAMBDAS_FOLDER_NAME);
export const GENERATED_FILES_FOLDER_PATH = join(process.cwd(), '@generated');
export const JSON_SCHEMAS_FOLDER_PATH = join(process.cwd(), '@generated', JSON_SCHEMAS_FOLDER_NAME);
export const AWS_PRICE_INFO_GENERATED_FOLDER_PATH = join(process.cwd(), '@generated', 'aws-price');
export const DB_ENGINE_VERSIONS_FOLDER = join(process.cwd(), '@generated', 'db-engine-versions');
export const LLM_DOCS_FOLDER_PATH = join(process.cwd(), '@generated', 'llm-docs');

/**
 * `@stacktape/config` owns the authored configuration model. The CLI reads its source directly — for schema
 * generation and documentation extraction, so the location is named once here rather than spelled out in each
 * generator.
 */
const CONFIG_PACKAGE_PATH = join(process.cwd(), '..', '..', 'packages', 'config');
export const CONFIG_PACKAGE_SRC_PATH = join(CONFIG_PACKAGE_PATH, 'src');
export const CONFIG_AUTHORING_PACKAGE_SRC_PATH = join(process.cwd(), '..', '..', 'packages', 'config-authoring', 'src');
/** CLI-owned resolved resource model consumed by synthesis and configuration-reference generation. */
export const RESOLVED_CONFIG_TYPES_PATH = join(process.cwd(), 'src', 'domain', 'config-manager', 'resolved-types');

export const CONFIG_SCHEMA_PATH = join(CONFIG_PACKAGE_PATH, 'generated', 'config-schema.json');

export const INSTALL_SCRIPTS_PATH = join(process.cwd(), 'scripts', 'install-scripts');
export const COMPLETIONS_SCRIPTS_PATH = join(process.cwd(), 'scripts', 'completions');
// export const INSTALL_PREVIEW_SCRIPTS_PATH = join(process.cwd(), 'scripts', 'install-scripts');
export const SCRIPTS_ASSETS_PATH = join(process.cwd(), 'scripts', 'assets');

export const CLI_SOURCE_PATH = join(SOURCE_FOLDER_PATH, 'entrypoints', 'cli.ts');
