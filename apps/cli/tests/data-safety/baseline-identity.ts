import type { CloudFormationTemplate } from '@stacktape/cloudformation/resource';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getGloballyUniqueStackHash } from '@stacktape/naming/stack-identity';
import type { SynthesisIdentity } from '../characterization/synthesis-fixture';

/**
 * Every baseline template is produced under this one stack identity, and the current template is synthesized under
 * it as well. Physical names and the globally unique stack hash derive from the account, region, project and stage,
 * so the identity must be the real one the v3 CLI compiled against: the hash in a committed v3 baseline can only be
 * reproduced with the same account ID. The account is the Stacktape development account; nothing is deployed to it by
 * this lane, the v3 CLI only compiles the template.
 */
export const baselineIdentity: SynthesisIdentity = {
  accountId: '977946299200',
  region: 'eu-west-1',
  projectName: 'j2-v3-baseline',
  stage: 'j2base'
};

export const baselineStackName = `${baselineIdentity.projectName}-${baselineIdentity.stage}`;

export const baselineStackHash = getGloballyUniqueStackHash({
  region: baselineIdentity.region,
  stackName: baselineStackName,
  accountId: baselineIdentity.accountId
});

export const baselinesDirectory = join(import.meta.dir, 'baselines');

export type BaselineProducer = 'v3' | 'v4';

export const baselineTemplateFileName = (producer: BaselineProducer) => `${producer}.template.json`;

export const listBaselineCases = async () => {
  const entries = await readdir(baselinesDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
};

export const baselineCaseDirectory = (caseName: string) => join(baselinesDirectory, caseName);

export const readBaselineTemplate = async (caseName: string, producer: BaselineProducer) => {
  const path = join(baselineCaseDirectory(caseName), baselineTemplateFileName(producer));
  return JSON.parse(await readFile(path, 'utf8')) as CloudFormationTemplate;
};

export type BaselineManifest = {
  identity: SynthesisIdentity;
  stackHash: string;
  cases: Record<
    string,
    Partial<
      Record<
        BaselineProducer,
        {
          producer: string;
          producedAt: string;
          command: string;
          /** Organization-level alarm resources the v3 compile added and the regeneration removed. */
          removedOrganizationAlarms?: string[];
        }
      >
    >
  >;
};

export const manifestPath = join(baselinesDirectory, 'manifest.json');

export const readManifest = async (): Promise<BaselineManifest> => {
  try {
    return JSON.parse(await readFile(manifestPath, 'utf8')) as BaselineManifest;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { identity: baselineIdentity, stackHash: baselineStackHash, cases: {} };
    }
    throw error;
  }
};
