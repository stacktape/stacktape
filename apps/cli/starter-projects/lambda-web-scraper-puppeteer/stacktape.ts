import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainApiGateway = new HttpApiGateway({});
  const scrapeLinks = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: 'src/scrape-links.ts',
      excludeDependencies: ['puppeteer'],
      languageSpecificConfig: {
        disableSourceMaps: true
      }
    }),
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'mainApiGateway',
        path: '/scrape-links/{url}',
        method: 'GET'
      })
    ]
  });

  return {
    resources: { mainApiGateway, scrapeLinks }
  };
});
