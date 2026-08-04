import { $Secret, PrebuiltImagePackaging, WebService, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const openWebUi = new WebService({
    packaging: new PrebuiltImagePackaging({
      image: 'ghcr.io/open-webui/open-webui:main'
    }),
    resources: {
      cpu: 1,
      memory: 2048
    },
    environment: { PORT: '3000', OPENAI_API_KEY: $Secret('openai-api-key') }
  });

  return {
    resources: { openWebUi }
  };
});
