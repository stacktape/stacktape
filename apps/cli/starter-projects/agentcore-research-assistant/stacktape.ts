import {
  AgentCoreBrowser,
  AgentCoreMemory,
  AgentCoreRuntime,
  CustomDockerfilePackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const researchMemory = new AgentCoreMemory({
    description: 'Stores prior research briefs, source preferences, and follow-up context.',
    expirationDays: 45
  });

  const researchBrowser = new AgentCoreBrowser({
    description: 'Managed browser for source discovery, page inspection, and citation gathering.',
    recording: {
      enabled: false
    }
  });

  const researchAgent = new AgentCoreRuntime({
    description: 'Research agent with managed browser automation and persistent research memory.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'researchMemory',
    useBrowser: 'researchBrowser',
    endpoints: [{ name: 'production', description: 'Main research assistant endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 3600,
      maxLifetime: 28800
    },
    environment: [
        { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'RESEARCH_SCOPE', value: 'market-research' }
    ]
  });

  return {
    resources: {
      researchAgent,
      researchMemory,
      researchBrowser
    }
  };
});
