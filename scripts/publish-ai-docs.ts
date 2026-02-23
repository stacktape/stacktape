import { AI_DOCS_BUCKET_NAME } from '@config';
import { AI_DOCS_FOLDER_PATH } from '@shared/naming/project-fs-paths';
import { logInfo, logSuccess } from '@shared/utils/logging';
import { generateAiDocsV2 as generateAiDocs } from './generate-ai-docs-v2';
import { syncBucket } from './release/stacktape';

export const publishAiDocs = async () => {
  logInfo('Publishing AI docs to the AI docs hosting bucket...');
  await generateAiDocs({ distFolderPath: AI_DOCS_FOLDER_PATH });
  await syncBucket({ bucketName: AI_DOCS_BUCKET_NAME, sourcePath: AI_DOCS_FOLDER_PATH });
  logSuccess('AI docs successfully published.');
};

if (import.meta.main) {
  publishAiDocs();
}
