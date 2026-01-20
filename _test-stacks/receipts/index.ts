import { defineConfig } from '../../__release-npm';
import type { StacktapeConfig } from '../../__release-npm';
import { getStackOutputs } from './outputs';
import { getResources } from './resources';
import { getCloudFormationResources } from './resources/cloudformation';
import { getScripts } from './scripts';

export default defineConfig(({ stage }): StacktapeConfig => {
  const resources = getResources({ stage });

  return {
    stackConfig: {
      outputs: getStackOutputs(stage)
    },
    resources,
    scripts: getScripts(stage, resources.mainPostgresDatabase),
    hooks: {
      beforeDev: [{ scriptName: 'buildProjects' }],
      beforeDeploy: [{ scriptName: 'buildProjects' }],
      afterDeploy: [{ scriptName: 'migrateDb' }]
    },
    cloudformationResources: getCloudFormationResources(stage)
  };
});
