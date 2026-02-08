import { TanStackWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new TanStackWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
