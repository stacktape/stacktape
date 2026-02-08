import { NuxtWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new NuxtWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
