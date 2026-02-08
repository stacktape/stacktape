import { AstroWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new AstroWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
