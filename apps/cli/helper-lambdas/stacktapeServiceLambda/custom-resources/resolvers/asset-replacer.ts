import type { ServiceLambdaResolver } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { StpServiceCustomResourceProperties } from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import type { ArchiveEntry } from '@stacktape/packaging/artifact/archive-entries';
import type { Readable } from 'node:stream';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { archiveItem } from '@utils/zip';
import micromatch from 'micromatch';
import pLimit from 'p-limit';
import { extractFunctionArchive } from './asset-replacer-archive';

type Replacement = NonNullable<StpServiceCustomResourceProperties['assetReplacer']>['replacements'][number];

let s3Client: S3Client | undefined;
/** Created on first use, so the SDK reads its configuration then rather than when the module loads. */
const getS3Client = () => {
  s3Client ??= new S3Client({});
  return s3Client;
};

/**
 * Writes resolved deployment values into a Next.js server function's ZIP and uploads the result under the same S3 key.
 *
 * Each invocation works in its own temporary directory, removed afterwards whether it succeeds or fails, with separate
 * paths for the downloaded ZIP, the extracted tree and the new ZIP. Extraction keeps the ZIP's layout, executable
 * files and links, and refuses entries that could make it write outside the tree (see `extractFunctionArchive`). The
 * production archiver then writes the new ZIP under the Lambda archive policy.
 *
 * Search and replacement values can be credentials, so no log line or error contains them. Delete leaves the object
 * alone.
 */
export const assetReplacer: ServiceLambdaResolver<StpServiceCustomResourceProperties['assetReplacer']> = async (
  currentProps,
  _previousProps,
  operation
) => {
  if (operation !== 'Create' && operation !== 'Update') {
    return { data: {} };
  }
  const { zipFileS3Key, replacements } = currentProps;
  const bucketName = currentProps.bucketName as string;
  const workspace = await mkdtemp(join(tmpdir(), 'stp-asset-replacer-'));
  try {
    const inputPath = join(workspace, 'input.zip');
    const extractedPath = join(workspace, 'extracted');
    const outputPath = join(workspace, 'output');

    console.info(`Asset replacer: downloading ${zipFileS3Key}.`);
    await downloadFromS3({ bucketName, s3Key: zipFileS3Key, filePath: inputPath });
    const entries = await extractFunctionArchive({ zipPath: inputPath, targetPath: extractedPath });
    // Lambda's /tmp holds 512 MB unless configured otherwise. With the downloaded ZIP removed, at most the tree and the
    // new ZIP exist at the same time.
    await rm(inputPath);
    const { changedFiles, occurrences } = await replaceInFiles({ entries, replacements });
    console.info(
      `Asset replacer: replaced ${occurrences} occurrence(s) of ${replacements.length} placeholder(s) in ${changedFiles} of ${entries.length} entries.`
    );

    await mkdir(outputPath);
    const archivePath = await archiveItem({
      absoluteSourcePath: extractedPath,
      absoluteDestDirPath: outputPath,
      format: 'zip',
      fileNameBase: 'function',
      // Measured 3–16 % faster than archiver's default 9 for 1–1.5 % more bytes, which travel within the region.
      compressionLevel: 6
    });
    await uploadToS3({ bucketName, s3Key: zipFileS3Key, filePath: archivePath });
    console.info(`Asset replacer: uploaded ${zipFileS3Key}.`);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
  return { data: {} };
};

/** Every occurrence of `search` in `content` replaced by `replacement`, byte for byte; nothing else changes. */
export const replaceBytes = (content: Buffer, search: Buffer, replacement: Buffer) => {
  const parts: Buffer[] = [];
  let start = 0;
  let count = 0;
  for (let index = content.indexOf(search); index !== -1; index = content.indexOf(search, start)) {
    parts.push(content.subarray(start, index), replacement);
    start = index + search.length;
    count += 1;
  }
  return count === 0 ? { content, count } : { content: Buffer.concat([...parts, content.subarray(start)]), count };
};

/**
 * Applies the replacements, in order, to every regular file whose path in the tree matches a replacement's pattern.
 * Values are inserted literally: `$&` and the other replacement patterns of `String.replace` mean nothing here. A file
 * without any placeholder is not rewritten, so its bytes stay exactly as they were.
 *
 * Patterns select files by their own path among the tree's known entries, so a link, even one to the tree itself, is
 * never followed, and each file is replaced once per rule however many links reach it. For the Next.js packaging's
 * patterns, `**\/*.@(*js|json|html)` and `index-wrap.mjs`, that is every file they mean: each such file has a matching
 * path of its own, and `index-wrap.mjs` is a file the packaging writes.
 */
export const replaceInFiles = async ({
  entries,
  replacements
}: {
  entries: ArchiveEntry[];
  replacements: Replacement[];
}) => {
  const rules = replacements.map(({ includeFilesPattern, searchString, replaceString }, index) => {
    if (!searchString) {
      throw new Error(`Asset replacer: replacement ${index + 1} has an empty search string.`);
    }
    return {
      isIncluded: micromatch.matcher(includeFilesPattern, { dot: true }),
      search: Buffer.from(searchString, 'utf8'),
      replacement: Buffer.from(replaceString, 'utf8')
    };
  });
  const limit = pLimit(16);
  let changedFiles = 0;
  let occurrences = 0;
  const outcomes = await Promise.allSettled(
    entries.map((entry) =>
      limit(async () => {
        if (entry.type !== 'file') return;
        const applicable = rules.filter(({ isIncluded }) => isIncluded(entry.path));
        if (applicable.length === 0) return;
        let content: Buffer = await readFile(entry.sourcePath);
        let fileOccurrences = 0;
        for (const { search, replacement } of applicable) {
          const result = replaceBytes(content, search, replacement);
          content = result.content;
          fileOccurrences += result.count;
        }
        if (fileOccurrences === 0) return;
        // Rewriting in place keeps the file's mode.
        await writeFile(entry.sourcePath, content);
        changedFiles += 1;
        occurrences += fileOccurrences;
      })
    )
  );
  // Every job has finished before a failure is reported, so none can write into the workspace after its cleanup.
  const failure = outcomes.find((outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected');
  if (failure) {
    throw failure.reason;
  }
  return { changedFiles, occurrences };
};

const downloadFromS3 = async ({
  bucketName,
  s3Key,
  filePath
}: {
  bucketName: string;
  s3Key: string;
  filePath: string;
}) => {
  const { Body } = await getS3Client().send(new GetObjectCommand({ Bucket: bucketName, Key: s3Key }));
  if (!Body) {
    throw new Error(`Asset replacer: S3 returned no content for ${s3Key}.`);
  }
  await pipeline(Body as Readable, createWriteStream(filePath, { flags: 'wx' }));
};

const uploadToS3 = ({ bucketName, s3Key, filePath }: { bucketName: string; s3Key: string; filePath: string }) =>
  new Upload({
    params: { Bucket: bucketName, Key: s3Key, Body: createReadStream(filePath) },
    client: getS3Client()
  }).done();
