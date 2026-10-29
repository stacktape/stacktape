import {
  $ResourceParam,
  $Secret,
  ApplicationLoadBalancer,
  JsBundleImagePackaging,
  LocalScript,
  MultiContainerWorkload,
  MultiContainerWorkloadLoadBalancerIntegration,
  Redis,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainLoadBalancer = new ApplicationLoadBalancer({});
  const redis = new Redis({
    defaultUserPassword: $Secret('redis.password'),
    engine: { type: 'valkey', properties: { instanceSize: 'cache.t4g.micro' } }
  });
  const websocketServer = new MultiContainerWorkload({
    resources: {
      cpu: 0.25,
      memory: 512
    },
    connectTo: [redis],
    containers: [
      {
        name: 'socketio-server',
        packaging: new JsBundleImagePackaging({
          entryfilePath: 'src/server/index.ts'
        }),
        environment: { PORT: '3000' },
        events: [
          new MultiContainerWorkloadLoadBalancerIntegration({
            containerPort: 3000,
            loadBalancerName: 'mainLoadBalancer',
            priority: 2,
            paths: ['/', '/websockets*']
          })
        ]
      }
    ],
    scaling: {
      minInstances: 2,
      maxInstances: 2
    }
  });

  const broadcastTest = new LocalScript({
    executeScript: 'scripts/broadcast-test.ts',
    environment: { LOAD_BALANCER_DOMAIN: $ResourceParam('loadBalancer', 'domain') }
  });

  return {
    resources: { mainLoadBalancer, redis, websocketServer },
    scripts: { broadcastTest }
  };
});
