import { HostingBucket, LocalScript, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const webBucket = new HostingBucket({
    uploadDirectoryPath: './dist',
    hostingContentType: 'single-page-app'
  });

  const build = new LocalScript({
    executeCommand: 'npm run build'
  });

  return {
    resources: { webBucket },
    scripts: { build },
    hooks: {
      beforeDeploy: [
        {
          scriptName: 'build'
        }
      ]
    }
  };
});
