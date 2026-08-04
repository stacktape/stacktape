import { getAtt, ref } from '@stacktape/cloudformation/intrinsics';

import { calculatedStackOverviewManager } from '@domain-services/calculated-stack-overview-manager';
import { configManager } from '@domain-services/config-manager';
import { cfEvaluatedLinks } from '@domain-services/calculated-stack-overview-manager/cloudformation-links';
import { cfLogicalNames } from '@stacktape/naming/cloudformation-logical-names';
import { PARENT_IDENTIFIER_SHARED_GLOBAL } from 'src/config/constants';
import { getStateMachineExecutionRole, getStateMachineResource } from './utils';

export const resolveStateMachines = async () => {
  const { stateMachines } = configManager;
  if (stateMachines.length) {
    calculatedStackOverviewManager.addCfChildResource({
      cfLogicalName: cfLogicalNames.globalStateMachinesRole(),
      resource: getStateMachineExecutionRole(),
      nameChain: [PARENT_IDENTIFIER_SHARED_GLOBAL]
    });
    await Promise.all(
      stateMachines.map(async (stateMachine) => {
        const stateMachineResource = await getStateMachineResource(stateMachine);
        calculatedStackOverviewManager.addCfChildResource({
          cfLogicalName: cfLogicalNames.stateMachine(stateMachine.name),
          resource: stateMachineResource,
          nameChain: stateMachine.nameChain
        });
        // adding executions link
        calculatedStackOverviewManager.addStacktapeResourceLink({
          linkName: 'state-machine-executions',
          nameChain: stateMachine.nameChain,
          linkValue: cfEvaluatedLinks.stateMachineExecutions(ref(cfLogicalNames.stateMachine(stateMachine.name)))
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'name',
          nameChain: stateMachine.nameChain,
          paramValue: getAtt(cfLogicalNames.stateMachine(stateMachine.name), 'Name'),
          showDuringPrint: true
        });
        calculatedStackOverviewManager.addStacktapeResourceReferenceableParam({
          paramName: 'arn',
          nameChain: stateMachine.nameChain,
          paramValue: ref(cfLogicalNames.stateMachine(stateMachine.name)),
          showDuringPrint: true
        });
      })
    );
  }
};
