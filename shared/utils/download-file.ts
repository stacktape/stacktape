import Downloader from 'nodejs-file-downloader';

type DownloaderReport = {
  downloadStatus: 'COMPLETE' | 'ABORTED';
  filePath: string | null;
};

export const downloadFile = ({
  downloadTo,
  url,
  fileName,
  headers
}: {
  downloadTo: string;
  url: string;
  fileName?: string;
  headers?: any;
}): Promise<DownloaderReport> => {
  const downloader = new Downloader({
    url,
    directory: downloadTo,
    headers,
    ...(fileName ? { fileName } : {})
  });
  return downloader.download();
};
