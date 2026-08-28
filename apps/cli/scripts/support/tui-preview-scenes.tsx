import { testRender } from '@opentui/solid';
import { interactionCoordinator } from '@application-services/tui-manager/interaction/coordinator';
import { tuiState } from '@application-services/tui-manager/progress/state';
import { ProgressDashboard } from '@application-services/tui-manager/progress/views/dashboard';

type Scene = { name: string; prepare: () => void; width?: number; height?: number };

const reset = () => {
  interactionCoordinator.rejectAllPending();
  tuiState.reset();
  tuiState.setHeader({
    action: 'DEPLOYING',
    projectName: 'checkout-api',
    stageName: 'production',
    region: 'eu-west-1'
  });
};

const baseActivities = () => {
  tuiState.setCurrentPhase('BUILD_AND_PACKAGE');
  tuiState.startEvent({ eventType: 'PACKAGE_ARTIFACTS', description: 'Packaging workloads' });
  tuiState.startEvent({
    eventType: 'BUILD_CODE',
    description: 'Building checkout-api',
    parentEventType: 'PACKAGE_ARTIFACTS',
    instanceId: 'checkout-api'
  });
  tuiState.finishEvent({
    eventType: 'BUILD_CODE',
    finalMessage: 'Built checkout-api',
    parentEventType: 'PACKAGE_ARTIFACTS',
    instanceId: 'checkout-api'
  });
  tuiState.startEvent({
    eventType: 'BUILD_CODE',
    description: 'Building payments-worker',
    parentEventType: 'PACKAGE_ARTIFACTS',
    instanceId: 'payments-worker'
  });
  tuiState.updateEvent({
    eventType: 'BUILD_CODE',
    additionalMessage: 'Installing dependencies',
    parentEventType: 'PACKAGE_ARTIFACTS',
    instanceId: 'payments-worker'
  });
};

const scenes: Scene[] = [
  { name: 'build-and-package', prepare: baseActivities },
  {
    name: 'cloudformation-deploy',
    prepare: () => {
      baseActivities();
      tuiState.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'Packaged 2 workloads' });
      tuiState.setCurrentPhase('DEPLOY');
      tuiState.startEvent({ eventType: 'UPDATE_STACK', description: 'Updating CloudFormation stack' });
      tuiState.updateEvent({
        eventType: 'UPDATE_STACK',
        additionalMessage: '5 of 14 resources complete',
        data: {
          kind: 'cloudformation-progress',
          stackAction: 'update',
          completedCount: 5,
          totalPlanned: 14,
          changeCounts: { created: 3, updated: 9, deleted: 2 },
          inProgressDetails: [
            { name: 'checkout-api', action: 'UPDATE', resourceType: 'AWS::ECS::Service' },
            { name: 'orders-db', action: 'UPDATE', resourceType: 'AWS::RDS::DBCluster' }
          ]
        }
      });
    }
  },
  { name: 'narrow-terminal', width: 60, height: 24, prepare: baseActivities },
  {
    name: 'completion',
    prepare: () => {
      baseActivities();
      tuiState.finishEvent({
        eventType: 'BUILD_CODE',
        finalMessage: 'Built payments-worker',
        parentEventType: 'PACKAGE_ARTIFACTS',
        instanceId: 'payments-worker'
      });
      tuiState.finishEvent({ eventType: 'PACKAGE_ARTIFACTS', finalMessage: 'Packaged 2 workloads' });
      tuiState.setSummary({
        success: true,
        message: 'DEPLOYMENT SUCCESSFUL',
        links: [{ label: 'Console', url: 'https://console.stacktape.com/example' }]
      });
    }
  }
];

const renderScene = async (scene: Scene): Promise<string> => {
  reset();
  scene.prepare();
  tuiState.flushPendingNotifications();
  const app = await testRender(
    () => <ProgressDashboard onQuit={() => {}} onCancel={() => {}} onSwitchView={() => {}} />,
    { width: scene.width ?? 100, height: scene.height ?? 32 }
  );
  await new Promise((resolve) => setTimeout(resolve, 20));
  await app.renderOnce();
  const frame = app.captureCharFrame();
  app.renderer.destroy();
  return `\n${'='.repeat(24)} ${scene.name} ${'='.repeat(24)}\n${frame}`;
};

export const renderAllScenes = async (): Promise<string> => {
  const frames: string[] = [];
  for (const scene of scenes) frames.push(await renderScene(scene));
  interactionCoordinator.rejectAllPending();
  tuiState.reset();
  return `${frames.join('\n')}\n`;
};
