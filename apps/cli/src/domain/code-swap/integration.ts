import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import type { buildUsingRailpack } from '@stacktape/packaging/image/railpack';
import type { buildJsBundleImage } from '@stacktape/packaging/buildpacks/js-bundle-image';

type ImageExtension = Parameters<typeof buildJsBundleImage>[0]['imageExtension'];
// Managers consume these narrow hooks. The CLI composition root installs the workflow, avoiding manager cycles.
export const codeSwapIntegration: {
  imageHasSupervisor: Map<string, boolean>;
  imageMatchesRunningCode: (jobName: string, digest: string, taskDefinition: string) => boolean;
  abortPreparation: () => Promise<void>;
  pythonExtension: (workloadName: string) => Promise<Parameters<typeof buildUsingRailpack>[0]['imageExtension']>;
  imageExtension: (workloadName: string) => Promise<ImageExtension>;
  template: (template: CloudFormationTemplate) => Promise<void>;
  rollbackTemplate: (template: CloudFormationTemplate) => void;
  releaseIdentity: () => { identity: unknown; mode: unknown; fallback: unknown } | undefined;
  nextVersion: (version: string) => string;
  teardownAccepted: (stackName: string) => void;
} = {
  imageHasSupervisor: new Map(),
  imageMatchesRunningCode: () => false,
  abortPreparation: async () => {},
  imageExtension: async () => undefined,
  pythonExtension: async () => undefined,
  template: async () => {},
  rollbackTemplate: () => {},
  releaseIdentity: () => undefined,
  nextVersion: (version) => version,
  teardownAccepted: () => {}
};
