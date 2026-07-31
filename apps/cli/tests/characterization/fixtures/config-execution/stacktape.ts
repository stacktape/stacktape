import { Bucket, defineConfig } from '@stacktape/config-authoring';

type ExecutionCounts = { module: number; factory: number };
const executionState = globalThis as typeof globalThis & { __stacktapeConfigExecutionCounts?: ExecutionCounts };
const executionCounts = (executionState.__stacktapeConfigExecutionCounts ??= { module: 0, factory: 0 });
executionCounts.module += 1;

export const getExecutionCounts = (): ExecutionCounts => ({ ...executionCounts });

export default defineConfig(() => {
  executionCounts.factory += 1;

  const uploads = new Bucket({
    transforms: {
      bucket: (properties) => ({ ...properties, VersioningConfiguration: { Status: 'Enabled' } })
    }
  });

  return {
    projectName: 'execution-config-project',
    resources: { uploads },
    finalTransform: (template) => ({
      ...template,
      Metadata: { ...template.Metadata, ConfigExecutionFixture: true }
    })
  };
});
