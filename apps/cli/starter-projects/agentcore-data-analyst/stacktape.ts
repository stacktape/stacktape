import {
  AgentCoreCodeInterpreter,
  AgentCoreMemory,
  AgentCoreRuntime,
  Bucket,
  DockerfilePackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const analysisMemory = new AgentCoreMemory({
    description: 'Stores user preferences, recurring KPI definitions, and analysis context.',
    eventRetentionDays: 90
  });

  const analysisCodeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code runtime for dataframe analysis, chart generation, and calculations.'
  });

  const reportsBucket = new Bucket({});

  const analystAgent = new AgentCoreRuntime({
    description: 'Data analyst agent for CSV exploration, KPI summaries, and report generation.',
    packaging: new DockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'analysisMemory',
    useCodeInterpreter: 'analysisCodeInterpreter',
    connectTo: [reportsBucket],
    endpoints: [{ name: 'production', description: 'Main data analyst endpoint.' }],
    lifecycle: {
      idleTimeoutSeconds: 3600,
      maxLifetimeSeconds: 28800
    },
    environment: {
      AI_MODEL: 'eu.amazon.nova-micro-v1:0',
      REPORT_PREFIX: 'analyst-reports/'
    }
  });

  return {
    resources: {
      analystAgent,
      analysisMemory,
      analysisCodeInterpreter,
      reportsBucket
    }
  };
});
