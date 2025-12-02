import type { Readable } from 'node:stream';
import { writeFile } from 'node:fs/promises';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { archiveItem } from '@shared/utils/zip';
import AdmZip from 'adm-zip';
import fastGlob from 'fast-glob';
import { createReadStream, readFile, remove } from 'fs-extra';
import pLimit from 'p-limit';

const s3Cli = new S3Client({});

export const assetReplacer: ServiceLambdaResolver<StpServiceCustomResourceProperties['assetReplacer']> = async (
  currentProps,
  _previousProps,
  operation
) => {
  if (operation === 'Create' || operation === 'Update') {
    const { bucketName, zipFileS3Key, replacements } = currentProps;

    // download and unzip file
    console.info(`downloading zip file ${zipFileS3Key} from bucket ${bucketName}...`);
    const { fileName, fileNameWithoutExtension } = getInfoFromS3Key(zipFileS3Key);
    const zipFilePath = `/tmp/${fileName}`;
    await downloadFileFromS3({
      bucketName: bucketName as string,
      s3Key: zipFileS3Key,
      filePath: zipFilePath
    });

    console.info(`downloading zip file ${currentProps.zipFileS3Key} from bucket ${currentProps.bucketName} - SUCCESS`);

    // extracting content
    const zipContentsPath = `/tmp/${fileNameWithoutExtension}`;
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(zipContentsPath);

    // replacing values
    for (const { includeFilesPattern, searchString, replaceString } of replacements) {
      const limit = pLimit(100);
      console.info(`replacing ${searchString} for ${replaceString}...`);
      const filesToAdjust = await fastGlob(includeFilesPattern, { dot: true, cwd: zipContentsPath });
      console.info(`files to adjust:\n${JSON.stringify(filesToAdjust, null, 2)}`);
      await Promise.all(
        filesToAdjust.map((filePath) => {
          return limit(async () => {
            const originalFileContents = (await readFile(`${zipContentsPath}/${filePath}`)).toString('utf-8');
            const newFileContents = originalFileContents.replaceAll(searchString, replaceString);
            return writeFile(`${zipContentsPath}/${filePath}`, newFileContents, { encoding: 'utf-8' });
          });
        })
      );

      console.info(`replacing ${searchString} for ${replaceString} - SUCCESS`);
    }

    // creating the zip
    console.info(`creating zip file ${fileName}...`);
    const zippedFilePath = await archiveItem({
      absoluteSourcePath: zipContentsPath,
      absoluteDestDirPath: '/tmp',
      format: 'zip',
      fileNameBase: fileNameWithoutExtension
    });
    console.info(`created zip file ${zippedFilePath} - SUCCESS`);

    // uploading back to s3
    console.info(`uploading zip file ${zipFilePath} into ${bucketName}...`);
    await uploadToS3Bucket({
      bucketName: bucketName as string,
      filePath: zipFilePath,
      s3Key: zipFileS3Key
    });
    console.info(`uploading zip file ${zipFilePath} into ${bucketName} - SUCCESS`);

    // cleanup
    await Promise.all([remove(zipFilePath), remove(zipContentsPath)]);
  }
  return { data: {} };
};

const uploadToS3Bucket = async ({
  bucketName,
  s3Key,
  filePath
}: {
  bucketName: string;
  s3Key: string;
  filePath: string;
}) => {
  const uploadCommand = new Upload({
    params: {
      Bucket: bucketName,
      Key: s3Key,
      Body: createReadStream(filePath)
    },
    client: s3Cli
  });
  return uploadCommand.done();
};

const getS3DownloadStream = async ({ bucketName, s3Key }: { bucketName: string; s3Key: string }) => {
  const { Body } = await s3Cli.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: s3Key
    })
  );
  return Body as Readable;
};

const downloadFileFromS3 = async ({
  bucketName,
  s3Key,
  filePath
}: {
  bucketName: string;
  s3Key: string;
  filePath: string;
}) => {
  const downloadStream = await getS3DownloadStream({
    bucketName: bucketName as string,
    s3Key
  });
  return writeFile(filePath, downloadStream);
};

const getInfoFromS3Key = (s3Key: string) => {
  const keySplit = s3Key.split('/');
  const fileName = keySplit[keySplit.length - 1];
  const prefix = keySplit.slice(0, -1).join('/');
  return { fileName, prefix, fileNameWithoutExtension: fileName.split('.')[0] };
};
