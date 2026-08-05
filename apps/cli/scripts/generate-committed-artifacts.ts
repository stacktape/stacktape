import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  CONFIG_SCHEMA_PATH,
  LLM_DOCS_FOLDER_PATH,
  STARTER_PROJECTS_METADATA_FOLDER_NAME
} from 'src/config/project-paths';
import { logSuccess } from '@scripts/support/logging';
import { assertGeneratedDirectoryCurrent, assertGeneratedFileCurrent } from './generation/generated-files';
import { getJsonSchemaGenerator } from './code-generation/utils';
import { enhanceConfigSchema } from './enhance-config-schema';
import { generateLlmDocs } from './generate-llm-docs';
import { generateSchemas } from './generate-schemas';
import { generateStarterProjectsMetadata } from './generate-starter-projects-metadata';

const FIX_COMMAND = 'pnpm --filter @stacktape/cli generate';

export const generateCommittedArtifacts = async () => {
  const generator = await getJsonSchemaGenerator();
  const schema = await generateSchemas({ jsonSchemaGenerator: generator });
  await enhanceConfigSchema({ generator, schema });
  await Promise.all([generateLlmDocs(), generateStarterProjectsMetadata({ distFolderPath: process.cwd() })]);
};

export const checkCommittedArtifacts = async () => {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'stacktape-committed-artifacts-'));
  const configSchemaPath = join(temporaryDirectory, 'config-schema.json');
  const schemaDirectory = join(temporaryDirectory, 'schemas');
  const zodSchemaPath = join(schemaDirectory, 'validate-config-zod.ts');
  const enhancedConfigSchemaPath = join(schemaDirectory, 'enhanced-config-schema.json');
  const apiReferenceDataPath = join(schemaDirectory, 'api-reference-data.json');
  const llmDocsDirectory = join(temporaryDirectory, 'llm-docs');

  try {
    const generator = await getJsonSchemaGenerator();
    const schema = await generateSchemas({
      configSchemaPath,
      jsonSchemaGenerator: generator,
      zodSchemaPath
    });
    await enhanceConfigSchema({ generator, outputPath: enhancedConfigSchemaPath, schema });
    const starterMetadataPath = await generateStarterProjectsMetadata({ distFolderPath: temporaryDirectory });
    await generateLlmDocs({ apiReferenceDataPath, enhancedConfigSchemaPath, outputDirectory: llmDocsDirectory });

    const checks = await Promise.allSettled([
      assertGeneratedFileCurrent({
        actualPath: CONFIG_SCHEMA_PATH,
        expectedPath: configSchemaPath,
        label: 'Stacktape config JSON schema',
        fixCommand: FIX_COMMAND
      }),
      assertGeneratedDirectoryCurrent({
        actualDirectory: join(process.cwd(), '@generated', 'schemas'),
        expectedDirectory: schemaDirectory,
        label: 'CLI schema artifacts',
        fixCommand: FIX_COMMAND
      }),
      assertGeneratedFileCurrent({
        actualPath: join(process.cwd(), STARTER_PROJECTS_METADATA_FOLDER_NAME),
        expectedPath: starterMetadataPath,
        label: 'Starter project metadata',
        fixCommand: FIX_COMMAND
      }),
      assertGeneratedDirectoryCurrent({
        actualDirectory: LLM_DOCS_FOLDER_PATH,
        expectedDirectory: llmDocsDirectory,
        label: 'LLM documentation corpus',
        fixCommand: FIX_COMMAND
      })
    ]);
    const failures = checks.flatMap((result) =>
      result.status === 'rejected'
        ? [result.reason instanceof Error ? result.reason.message : String(result.reason)]
        : []
    );
    if (failures.length > 0) throw new Error(failures.join('\n\n'));
    logSuccess('All committed CLI-generated artifacts are current.');
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
};

if (import.meta.main) {
  const operation = process.argv.includes('--check') ? checkCommittedArtifacts() : generateCommittedArtifacts();
  operation.catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
