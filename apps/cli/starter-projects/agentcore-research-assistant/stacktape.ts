import {
  AgentCoreBrowser,
  AgentCoreMemory,
  AgentCoreRuntime,
  DockerfilePackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const researchMemory = new AgentCoreMemory({
    description: 'Stores prior research briefs, source preferences, and follow-up context.',
    eventRetentionDays: 45
  });

  const researchBrowser = new AgentCoreBrowser({
    description: 'Managed browser for source discovery, page inspection, and citation gathering.',
    recording: {
      enabled: false
    }
  });

  const researchAgent = new AgentCoreRuntime({
    description: 'Research agent with managed browser automation and persistent research memory.',
    packaging: new DockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'researchMemory',
    useBrowser: 'researchBrowser',
    endpoints: [{ name: 'production', description: 'Main research assistant endpoint.' }],
    lifecycle: {
      idleTimeoutSeconds: 3600,
      maxLifetimeSeconds: 28800
    },
    environment: {
      AI_MODEL: 'eu.amazon.nova-micro-v1:0',
      RESEARCH_SCOPE: 'market-research'
    }
  });

  return {
    resources: {
      researchAgent,
      researchMemory,
      researchBrowser
    }
  };
});
