import { RemixWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new RemixWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
