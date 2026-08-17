import yauzl from 'yauzl';

/** Reads ZIP central-directory metadata without extracting the archive. */
export const getZipUncompressedSizeBytes = (zipPath: string): Promise<number> =>
  new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, strictFileNames: true }, (openError, zipFile) => {
      if (openError || !zipFile) {
        reject(openError ?? new Error(`Could not open ZIP archive ${zipPath}.`));
        return;
      }
      let total = 0;
      let settled = false;
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        zipFile.close();
        reject(error);
      };
      zipFile.on('error', fail);
      zipFile.on('entry', (entry) => {
        total += entry.uncompressedSize;
        if (!Number.isSafeInteger(total)) {
          fail(new Error(`ZIP archive ${zipPath} has an invalid total uncompressed size.`));
          return;
        }
        zipFile.readEntry();
      });
      zipFile.on('end', () => {
        if (settled) return;
        settled = true;
        resolve(total);
      });
      zipFile.readEntry();
    });
  });
