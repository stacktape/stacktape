/* eslint-disable ts/no-require-imports */
import type { ChildResourcesMap, ReferenceableParamsMap } from './code-generation/types';
import { join } from 'node:path';
import { NPM_RELEASE_FOLDER_PATH, SOURCE_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { buildEsCode } from '@shared/packaging/bundlers/es';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { localBuildTsConfigPath } from '@shared/utils/misc';
import { prettifyFile } from '@shared/utils/prettier';
import { outputFile } from 'fs-extra';
import * as ts from 'typescript';
import { getResourcesWithAugmentedProps, RESOURCES } from '../src/api/npm/ts/resource-metadata';
import {
  generateAugmentedPropsTypes,
  generateSdkPropsImports,
  generateStacktapeConfigType
} from './code-generation/generate-augmented-props';
import { generatePropertiesInterfaces } from './code-generation/generate-cf-properties';
import { generateCloudFormationResourceType } from './code-generation/generate-cloudformation-resource-type';
import { generateOverrideTypes, generateTransformsTypes } from './code-generation/generate-overrides';
import { generateResourceClassDeclarations } from './code-generation/generate-resource-classes';
import {
  generateTypePropertiesClassDeclarations,
  getTypePropertiesImports
} from './code-generation/generate-type-properties';

const PATHS = {
  source: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'index.ts'),
  distJs: join(NPM_RELEASE_FOLDER_PATH, 'index.js'),
  distDts: join(NPM_RELEASE_FOLDER_PATH, 'index.d.ts'),
  childResources: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'child-resources.ts'),
  resourceMetadata: join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', 'resource-metadata.ts')
} as const;

const SOURCE_FILES = [
  'config.ts',
  'resources.ts',
  'type-properties.ts',
  'global-aws-services.ts',
  'directives.ts',
  'resource-metadata.ts'
].map((file) => join(SOURCE_FOLDER_PATH, 'api', 'npm', 'ts', file));

/**
 * Extracts essential declarations from compiled config.d.ts
 * These are declarations that should appear before augmented props in the output
 */
function extractEssentialDeclarations(configDts: string): string {
  const matches: string[] = [];

  // Extract symbol declarations
  const symbolPatterns = [
    'declare const getParamReferenceSymbol:',
    'declare const getTypeSymbol:',
    'declare const getPropertiesSymbol:',
    'declare const getOverridesSymbol:'
  ];

  for (const pattern of symbolPatterns) {
    const startIdx = configDts.indexOf(pattern);
    if (startIdx !== -1) {
      const endIdx = configDts.indexOf(';', startIdx);
      if (endIdx !== -1) {
        matches.push(configDts.substring(startIdx, endIdx + 1));
      }
    }
  }

  // Extract class/type declarations by looking for the start and matching braces
  const classPatterns = [
    'export declare class ResourceParamReference',
    'export declare class BaseTypeProperties',
    'export declare class BaseResource',
    'export type GetConfigParams'
  ];

  for (const pattern of classPatterns) {
    const startIdx = configDts.indexOf(pattern);
    if (startIdx !== -1) {
      let braceCount = 0;
      let inBlock = false;
      let endIdx = startIdx;

      for (let i = startIdx; i < configDts.length; i++) {
        const char = configDts[i];

        if (char === '{') {
          inBlock = true;
          braceCount++;
        } else if (char === '}') {
          braceCount--;
          if (inBlock && braceCount === 0) {
            endIdx = i;
            break;
          }
        } else if (char === ';' && !inBlock) {
          endIdx = i;
          break;
        }
      }

      matches.push(configDts.substring(startIdx, endIdx + 1));
    }
  }

  return matches.join('\n\n');
}

const compileTsConfigHelpersSource = async () => {
  logInfo('Compiling TypeScript config helpers source...');

  await buildEsCode({
    keepNames: true,
    sourceMapBannerType: 'pre-compiled',
    sourceMaps: 'inline',
    minify: false,
    nodeTarget: '22',
    cwd: process.cwd(),
    externals: ['esbuild'],
    tsConfigPath: localBuildTsConfigPath,
    sourcePath: PATHS.source,
    distPath: PATHS.distJs
  });

  logSuccess('TypeScript config helpers source compiled successfully');
};

/**
 * Cleans TypeScript declarations by removing imports and re-exports
 */
function cleanDeclarations(content: string, keepSdkImports: boolean = false): string {
  let cleaned = content;

  if (keepSdkImports) {
    // Preserve SDK imports
    const sdkImportMatch = cleaned.match(/^import\s+type\s+\{[^}]+\}\s+from\s+['"]@stacktape\/sdk\/sdk['"];?\s*$/gm);
    const sdkImports = sdkImportMatch ? sdkImportMatch.join('\n') : '';

    // Remove all imports
    cleaned = cleaned.replace(/^import\s+(?:\S.*?)??from\s+['"].*?['"];?\s*$/gm, '');

    // Restore SDK imports
    if (sdkImports) {
      cleaned = `${sdkImports}\n\n${cleaned}`;
    }
  } else {
    // Remove all imports
    cleaned = cleaned.replace(/^import\s+(?:\S.*?)??from\s+['"].*?['"];?\s*$/gm, '');
  }

  // Remove re-exports
  cleaned = cleaned.replace(/^export\s*\{[\s\S]*?\}\s*from\s+['"].*?['"];?\s*$/gm, '');

  return cleaned.trim();
}

/**
 * Removes duplicate declarations that are defined in ESSENTIAL_DECLARATIONS
 */
function removeDuplicateDeclarations(content: string): string {
  const duplicatePatterns = [
    'declare const getParamReferenceSymbol:',
    'declare const getTypeSymbol:',
    'declare const getPropertiesSymbol:',
    'declare const getOverridesSymbol:',
    'export declare class BaseResource',
    'export declare class ResourceParamReference',
    'export declare class BaseTypeProperties',
    'export type GetConfigParams'
  ];

  const linesToSkip = new Set<number>();
  const lines = content.split('\n');
  let inBlockToSkip = false;
  let braceDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if we're starting a block to skip
    if (!inBlockToSkip && duplicatePatterns.some((pattern) => line.includes(pattern))) {
      inBlockToSkip = true;
      braceDepth = 0;
    }

    if (inBlockToSkip) {
      linesToSkip.add(i);
      braceDepth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;

      // End of block
      if (braceDepth <= 0 && (line.includes('}') || line.includes(';'))) {
        inBlockToSkip = false;
      }
    }
  }

  return lines
    .filter((_, i) => !linesToSkip.has(i))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Filters out resource and type properties class declarations that we generate manually
 */
function filterAutoGeneratedClasses(content: string, resourceClassNames: string[]): string {
  const lines = content.split('\n');

  const isResourceClass = (line: string): boolean => {
    return resourceClassNames.some((className) => line.includes(`export declare const ${className}:`));
  };

  const isTypePropertyClass = (line: string): boolean => {
    return (
      line.includes('export declare const') &&
      (line.includes('Engine') ||
        line.includes('Packaging') ||
        line.includes('Integration') ||
        line.includes('Route') ||
        line.includes('Rule') ||
        line.includes('Script') ||
        line.includes('LogForwarding') ||
        line.includes('LifecycleRule') ||
        line.includes('Mount'))
    );
  };

  return lines.filter((line) => !isResourceClass(line) && !isTypePropertyClass(line)).join('\n');
}

/**
 * Compiles TypeScript source files and emits declarations
 */
function compileDeclarations(): Map<string, string> {
  const compilerOptions: ts.CompilerOptions = {
    declaration: true,
    emitDeclarationOnly: true,
    skipLibCheck: true,
    moduleResolution: ts.ModuleResolutionKind.NodeJs,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    types: ['node'],
    baseUrl: process.cwd()
  };

  const program = ts.createProgram(SOURCE_FILES, compilerOptions);
  const declarations = new Map<string, string>();

  program.emit(
    undefined,
    (fileName, data) => {
      if (fileName.endsWith('.d.ts')) {
        const baseName = fileName.split(/[/\\]/).pop()!.replace('.d.ts', '');
        declarations.set(baseName, data);
      }
    },
    undefined,
    true
  );

  if (declarations.size === 0) {
    throw new Error('Failed to generate TypeScript declarations');
  }

  return declarations;
}

/**
 * Generates comprehensive TypeScript declarations
 */
export async function generateTypeDeclarations(): Promise<void> {
  logInfo('Generating TypeScript declarations for config...');

  // Load runtime metadata
  const CHILD_RESOURCES: ChildResourcesMap = require(PATHS.childResources).CHILD_RESOURCES;
  const REFERENCEABLE_PARAMS: ReferenceableParamsMap = require(PATHS.resourceMetadata).REFERENCEABLE_PARAMS;

  // Generate CloudFormation-related types
  logInfo('Extracting Properties interfaces from CloudFormation files...');
  const propertiesInterfaces = generatePropertiesInterfaces(CHILD_RESOURCES);
  const overridesTypes = generateOverrideTypes(CHILD_RESOURCES);
  const transformsTypes = generateTransformsTypes(CHILD_RESOURCES);
  const cloudFormationResourceType = generateCloudFormationResourceType();

  // Compile source files
  logInfo('Compiling TypeScript source files...');
  const declarations = compileDeclarations();

  // Extract and process declarations
  const configDts = cleanDeclarations(declarations.get('config') || '');
  const essentialDeclarations = extractEssentialDeclarations(configDts);
  const configCleaned = removeDuplicateDeclarations(configDts);

  // Get resource class names for filtering
  const resourceClassNames = RESOURCES.map((r) => r.className);

  // Filter auto-generated classes
  const resourcesDts = filterAutoGeneratedClasses(declarations.get('resources') || '', resourceClassNames);
  const typePropertiesDts = filterAutoGeneratedClasses(declarations.get('type-properties') || '', resourceClassNames);

  // Generate custom declarations
  logInfo('Generating resource and type property declarations...');
  const augmentedPropsTypes = generateAugmentedPropsTypes();
  const stacktapeConfigType = generateStacktapeConfigType();
  const resourceClassDeclarations = generateResourceClassDeclarations(REFERENCEABLE_PARAMS);
  const typePropertiesClassDeclarations = generateTypePropertiesClassDeclarations();

  // Generate imports
  const sdkPropsImports = generateSdkPropsImports();
  const resourcesWithAugmented = getResourcesWithAugmentedProps();
  const sdkPropsWithAugmentation = [
    ...resourcesWithAugmented.map((r) => r.propsType),
    'LocalScriptProps',
    'BastionScriptProps',
    'LocalScriptWithBastionTunnelingProps'
  ];
  const typePropertiesImports = getTypePropertiesImports(sdkPropsWithAugmentation);

  // Bundle everything together
  const bundledDts = `/* eslint-disable */
// @ts-nocheck
// Generated file - Do not edit manually
// Generated by scripts/build-npm-main-export.ts

// ==========================================
// SDK TYPE IMPORTS
// ==========================================

import type {
  ${sdkPropsImports},
  ${typePropertiesImports.join(',\n  ')}
} from './sdk';

// ==========================================
// CONFIG TYPES
// ==========================================

${configCleaned}

// ==========================================
// ESSENTIAL BASE TYPES
// ==========================================
${essentialDeclarations}

// ==========================================
// AUGMENTED PROPS TYPES
// ==========================================

${augmentedPropsTypes}

// ==========================================
// CLOUDFORMATION OVERRIDES
// ==========================================

${overridesTypes}

// ==========================================
// CLOUDFORMATION TRANSFORMS
// ==========================================

${transformsTypes}

// ==========================================
// RESOURCE CLASS DECLARATIONS
// ==========================================

${resourceClassDeclarations}

// ==========================================
// STACKTAPE CONFIG TYPE
// ==========================================

${stacktapeConfigType}

// ==========================================
// TYPE PROPERTIES CLASS DECLARATIONS
// ==========================================

${typePropertiesClassDeclarations}

// ==========================================
// CLOUDFORMATION PROPERTIES INTERFACES
// ==========================================

${propertiesInterfaces}

// ==========================================
// CLOUDFORMATION RESOURCE TYPE
// ==========================================

${cloudFormationResourceType}

// ==========================================
// ADDITIONAL GENERATED TYPES
// ==========================================

${cleanDeclarations(resourcesDts)}

${cleanDeclarations(typePropertiesDts)}

${cleanDeclarations(declarations.get('global-aws-services') || '')}

${cleanDeclarations(declarations.get('directives') || '')}

${cleanDeclarations(declarations.get('resource-metadata') || '')}
`;

  // Write and format output
  await outputFile(PATHS.distDts, bundledDts, { encoding: 'utf8' });
  await prettifyFile({ filePath: PATHS.distDts });
  await prettifyFile({ filePath: PATHS.distDts }); // Run twice for prettier bug

  logSuccess(`TypeScript declarations generated to ${PATHS.distDts}`);
}

export async function buildNpmMainExport(): Promise<void> {
  await Promise.all([compileTsConfigHelpersSource(), generateTypeDeclarations()]);
  logSuccess('NPM main export build completed successfully');
}

// Run if executed directly
const isMain = process.argv[1]?.includes('build-npm-main-export');
if (isMain) {
  buildNpmMainExport();
}
