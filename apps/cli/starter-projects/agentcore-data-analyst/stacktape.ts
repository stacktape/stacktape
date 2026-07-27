import {
  AgentCoreCodeInterpreter,
  AgentCoreMemory,
  AgentCoreRuntime,
  Bucket,
  CustomDockerfilePackaging,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const analysisMemory = new AgentCoreMemory({
    description: 'Stores user preferences, recurring KPI definitions, and analysis context.',
    expirationDays: 90
  });

  const analysisCodeInterpreter = new AgentCoreCodeInterpreter({
    description: 'Sandboxed code runtime for dataframe analysis, chart generation, and calculations.'
  });

  const reportsBucket = new Bucket({});

  const analystAgent = new AgentCoreRuntime({
    description: 'Data analyst agent for CSV exploration, KPI summaries, and report generation.',
    packaging: new CustomDockerfilePackaging({
      buildContextPath: './'
    }),
    useMemory: 'analysisMemory',
    useCodeInterpreter: 'analysisCodeInterpreter',
    connectTo: [reportsBucket],
    endpoints: [{ name: 'production', description: 'Main data analyst endpoint.' }],
    lifecycle: {
      idleRuntimeSessionTimeout: 3600,
      maxLifetime: 28800
    },
    environment: [
        { name: 'AI_MODEL', value: 'eu.amazon.nova-micro-v1:0' },
      { name: 'REPORT_PREFIX', value: 'analyst-reports/' }
    ]
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
