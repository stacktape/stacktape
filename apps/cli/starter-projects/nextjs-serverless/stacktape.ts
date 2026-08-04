import { NextjsWeb, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const web = new NextjsWeb({
    appDirectory: './'
  });

  return {
    resources: { web }
  };
});
