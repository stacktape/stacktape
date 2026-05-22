import { LLM_DOCS_BUCKET_NAME } from '@config';
import { LLM_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { generateLlmDocs } from './generate-llm-docs';
import { syncBucket } from './release/stacktape';

export const publishLlmDocs = async () => {
  logInfo('Publishing LLM docs to the LLM docs hosting bucket...');
  await generateLlmDocs();
  await syncBucket({ bucketName: LLM_DOCS_BUCKET_NAME, sourcePath: LLM_DOCS_FOLDER_PATH });
  logSuccess('LLM docs successfully published.');
};

if (import.meta.main) {
  publishLlmDocs();
}
