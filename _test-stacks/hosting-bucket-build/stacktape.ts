import { defineConfig, HostingBucket } from '../../__release-npm';

export default defineConfig(() => {
  const frontend = new HostingBucket({
    uploadDirectoryPath: './frontend/dist',
    hostingContentType: 'single-page-app',
    build: {
      command: 'bun run build',
      workingDirectory: './frontend'
    },
    injectEnvironment: [
      {
        name: 'STP_INJECTED_ENV_TEST',
        value: 'test'
      }
    ]
  });

  return {
    resources: { frontend }
  };
});
