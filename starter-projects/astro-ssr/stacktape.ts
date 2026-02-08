import { NixpacksPackaging, WebService, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const webService = new WebService({
    packaging: new NixpacksPackaging({
      sourceDirectoryPath: './',
      startCmd: 'node ./dist/server/entry.mjs'
    }),
    resources: {
      cpu: 0.25,
      memory: 512
    }
  });

  return {
    resources: { webService }
  };
});
