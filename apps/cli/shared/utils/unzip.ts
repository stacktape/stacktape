import { dirname, extname, join } from 'node:path';
import { createWriteStream, ensureDirSync } from 'fs-extra';
import yauzl from 'yauzl';

const sanitizeFileName = (fileName: string): string => {
  // Replace invalid characters with underscores
  return fileName.replace(/[<>:"|?*]/g, '_');
};

export const unzip = async ({
  filterExts = [],
  outputDir,
  zipFilePath
}: {
  zipFilePath: string;
  outputDir: string;
  filterExts?: string[];
}): Promise<{ outputDirPath: string }> => {
  return new Promise((resolve, reject) => {
    yauzl.open(zipFilePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) {
        reject(err);
        return;
      }

      // Ensure output directory exists
      ensureDirSync(outputDir);

      let outputDirPath: string | null = null; // To track the absolute path of the first extracted entry

      zipFile.readEntry();

      zipFile.on('entry', (entry) => {
        if (!entry.fileName || typeof entry.fileName !== 'string') {
          console.warn('Skipping invalid entry:', entry.fileName);
          zipFile.readEntry();
          return;
        }

        const fileName = sanitizeFileName(entry.fileName);
        const fileExt = extname(fileName);
        const filePath = join(outputDir, fileName);

        if (!outputDirPath) {
          outputDirPath = filePath; // Save the absolute path of the first entry
        }

        if (entry.fileName.endsWith('/')) {
          // Directory entry, ensure it exists
          ensureDirSync(filePath);
          zipFile.readEntry();
        } else if (filterExts.includes(fileExt)) {
          // Skip files with excluded extensions
          zipFile.readEntry();
        } else {
          // Extract file
          ensureDirSync(dirname(filePath));

          zipFile.openReadStream(entry, (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }

            const writeStream = createWriteStream(filePath);

            readStream.pipe(writeStream);
            writeStream.on('close', () => {
              zipFile.readEntry();
            });

            writeStream.on('error', (writeErr) => {
              reject(writeErr);
            });

            readStream.on('error', (readErr) => {
              reject(readErr);
            });
          });
        }
      });

      zipFile.on('end', () => {
        resolve({ outputDirPath: outputDirPath || '' }); // Resolve with the absolute path of the first entry
      });

      zipFile.on('error', reject);
    });
  });
};
