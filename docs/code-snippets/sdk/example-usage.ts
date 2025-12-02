import { Stacktape } from 'stacktape';

const stacktape = new Stacktape({
  region: 'eu-west-1',
  stage: 'production'
});

const run = async () => {
  await Promise.all([
    stacktape.deploy({
      config: {
        serviceName: 'stack-1',
        resources: [
          /* ...your resources... */
        ]
      }
    }),
    stacktape.deploy({
      config: {
        serviceName: 'stack-2',
        resources: [
          /* ...your resources... */
        ]
      }
    })
  ]);
};

run();
