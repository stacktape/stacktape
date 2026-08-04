import { SolidStartWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new SolidStartWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
