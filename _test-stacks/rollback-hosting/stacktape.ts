import { defineConfig, HostingBucket } from '../../__release-npm';

export default defineConfig(() => {
  const site = new HostingBucket({
    uploadDirectoryPath: './public',
    hostingContentType: 'single-page-app'
  });

  return {
    resources: { site }
  };
});
