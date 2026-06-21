import { AgentCoreRuntime, CustomDockerfilePackaging, defineConfig } from '../../__release-npm';

export default defineConfig(() => {
  const minimalAgent = new AgentCoreRuntime({
    description: 'AgentCore minimal runtime test with implicit default endpoint.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    lifecycle: {
      idleRuntimeSessionTimeout: 600,
      maxLifetime: 3600
    },
    requestHeaders: ['x-test-allowed-header'],
    tags: [
      { name: 'suite', value: 'agentcore-edge' },
      { name: 'scenario', value: 'minimal-default' }
    ],
    environment: [{ name: 'STP_TEST_MARKER', value: 'minimal-v1' }]
  });

  return {
    resources: {
      minimalAgent
    }
  };
});
