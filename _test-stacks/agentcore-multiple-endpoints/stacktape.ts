import { AgentCoreRuntime, CustomDockerfilePackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const endpointFanoutAgent = new AgentCoreRuntime({
    description: 'AgentCore runtime test with multiple runtime endpoints.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    endpoints: ['alpha', { name: 'beta', description: 'Second endpoint for endpoint fanout testing.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 600,
      maxLifetime: 3600
    },
    environment: [{ name: 'STP_TEST_MARKER', value: 'multi-endpoint-v2' }]
  });

  return {
    resources: {
      endpointFanoutAgent
    }
  };
});
