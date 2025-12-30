import { applicationManager } from '@application-services/application-manager';
import { globalStateManager } from '@application-services/global-state-manager';
import { deployedStackOverviewManager } from '@domain-services/deployed-stack-overview-manager';
import { stpErrors } from '@errors';
import { wait } from '@shared/utils/misc';
import { startPortForwardingSessions } from '@utils/ssm-session';
import { tuiManager } from '@utils/tui';
import { initializeStackServicesForWorkingWithDeployedStack } from '../_utils/initialization';

export const commandBastionTunnel = async () => {
  await initializeStackServicesForWorkingWithDeployedStack({
    commandModifiesStack: false,
    commandRequiresConfig: false
  });

  const { bastionResource, resourceName } = globalStateManager.args;

  const deployedStpResource = deployedStackOverviewManager.getStpResource({ nameChain: resourceName });
  if (!deployedStpResource) {
    throw stpErrors.e98({ stpResourceName: resourceName });
  }
  if (!isBastionTunnelingPossible({ resource: deployedStpResource })) {
    throw stpErrors.e99({
      stpResourceName: resourceName,
      stpResourceType: deployedStpResource.resourceType as StpResourceType
    });
  }

  const targets = deployedStackOverviewManager.resolveBastionTunnelsForTarget({
    targetStpName: resourceName,
    bastionStpName: bastionResource
  });

  const tunnels = await startPortForwardingSessions({
    targets,
    startAtPort: globalStateManager.args.localTunnelingPort
  });

  tuiManager.info(
    `Following tunnels are open:\n\n${targets
      .map(({ label, additionalStringToSubstitute, remoteHost, remotePort }, index) => {
        return ` - ${tuiManager.prettyResourceName(resourceName)} ${tuiManager.colorize(
          'gray',
          label
        )} --> ${tuiManager.colorize('green', `127.0.0.1:${tunnels[index].localPort}`)}${
          additionalStringToSubstitute
            ? ` ( ${tuiManager.colorize(
                'gray',
                additionalStringToSubstitute.replace(
                  `${remoteHost}:${remotePort}`,
                  `127.0.0.1:${tunnels[index].localPort}`
                )
              )} )`
            : ''
        }`;
      })
      .join('\n')}\n`
  );

  applicationManager.registerCleanUpHook(async () => {
    // printer.info('Received exit signal. Closing tunnels...');
    return Promise.all(tunnels.map((tunnel) => tunnel.kill()));
  });

  // blocking event loop? maybe there is some other better way

  while (true) {
    await wait(3000);
  }
};

const isBastionTunnelingPossible = ({ resource }: { resource: StackInfoMapResource }) => {
  const supportedResourceTypes: StpResourceType[] = [
    'relational-database',
    'redis-cluster',
    'application-load-balancer',
    'private-service'
  ];
  if (!supportedResourceTypes.includes(resource.resourceType as StpResourceType)) {
    return false;
  }
  if (resource.resourceType === 'private-service' && !resource._nestedResources.loadBalancer) {
    return false;
  }
  return true;
};
