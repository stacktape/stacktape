import { SvelteKitWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new SvelteKitWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
