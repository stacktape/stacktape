import { TanStackWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './',
    buildCommand: 'vinxi build'
  });

  return {
    resources: { web }
  };
});
