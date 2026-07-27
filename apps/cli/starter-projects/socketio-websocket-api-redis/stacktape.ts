import {
  $ResourceParam,
  $Secret,
  ApplicationLoadBalancer,
  LocalScript,
  MultiContainerWorkload,
  MultiContainerWorkloadLoadBalancerIntegration,
  RedisCluster,
  StacktapeImageBuildpackPackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const mainLoadBalancer = new ApplicationLoadBalancer({});
  const redis = new RedisCluster({
    defaultUserPassword: $Secret('redis.password'),
    instanceSize: 'cache.t3.micro',
    engineVersion: '7.1'
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
        packaging: new StacktapeImageBuildpackPackaging({
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
