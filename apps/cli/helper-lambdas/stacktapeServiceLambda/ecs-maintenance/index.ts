import {
  AutoScalingClient,
  DescribeAutoScalingGroupsCommand,
  SetDesiredCapacityCommand
} from '@aws-sdk/client-auto-scaling';
import {
  CodeDeployClient,
  CreateDeploymentCommand,
  DeploymentStatus,
  ListDeploymentsCommand
} from '@aws-sdk/client-codedeploy';
import { DescribeServicesCommand, ECSClient, PlacementConstraintType, UpdateServiceCommand } from '@aws-sdk/client-ecs';

import dayjs from 'dayjs';

const ecsClient = new ECSClient({});
const codeDeployClient = new CodeDeployClient({});
const autoscalingClient = new AutoScalingClient({});

export default async (event: EcsServiceScheduledMaintenanceRuleInput) => {
  // we always need to update placement constraints to ensure only new instances will be used
  const ecsServiceArn: string = event.ecsServiceArn as string;
  const [, clusterName, ecsServiceName] = ecsServiceArn.split('/');
  console.info(`[${ecsServiceName}] Updating ECS Service configuration...`);

  ecsClient.send(
    new UpdateServiceCommand({
      service: ecsServiceArn,
      cluster: clusterName,
      placementConstraints: [
        {
          type: PlacementConstraintType.MEMBER_OF,
          expression: `registeredAt >= ${dayjs().format('YYYY-MM-DD')}`
        }
      ]
    })
  );
  console.info(`[${ecsServiceName}] Getting ECS Service info...`);
  const {
    services: [serviceInfo]
  } = await ecsClient.send(new DescribeServicesCommand({ services: [ecsServiceArn], cluster: clusterName }));

  if (event.codeDeployApplicationName) {
    console.info(`[${ecsServiceName}] Getting blue-green deployment info...`);
    const { deployments } = await codeDeployClient.send(
      new ListDeploymentsCommand({
        applicationName: event.codeDeployApplicationName,
        deploymentGroupName: event.codeDeployDeploymentGroupName,
        includeOnlyStatuses: [
          DeploymentStatus.BAKING,
          DeploymentStatus.CREATED,
          DeploymentStatus.IN_PROGRESS,
          DeploymentStatus.QUEUED,
          DeploymentStatus.READY
        ]
      })
    );
    if (deployments?.length) {
      console.info(
        `[${ecsServiceName}] There is ongoing blue/green deployment(ID ${deployments[0]}). Skipping re-deploy.`
      );
      return;
    }
    console.info(`[${ecsServiceName}] Starting blue/green ECS Service deployment...`);
    await codeDeployClient.send(
      new CreateDeploymentCommand({
        applicationName: event.codeDeployApplicationName,
        deploymentGroupName: event.codeDeployDeploymentGroupName,
        deploymentConfigName: 'CodeDeployDefault.ECSAllAtOnce',
        autoRollbackConfiguration: {
          enabled: true,
          events: ['DEPLOYMENT_FAILURE', 'DEPLOYMENT_STOP_ON_ALARM', 'DEPLOYMENT_STOP_ON_REQUEST']
        },
        revision: {
          revisionType: 'AppSpecContent',
          appSpecContent: {
            content: JSON.stringify({
              Resources: [
                {
                  TargetService: {
                    Type: 'AWS::ECS::Service',
                    Properties: {
                      TaskDefinition: serviceInfo.taskDefinition,
                      LoadBalancerInfo: {
                        ContainerName: serviceInfo.loadBalancers[0].containerName,
                        ContainerPort: serviceInfo.loadBalancers[0].containerPort
                      },
                      PlatformVersion: serviceInfo.platformVersion, // should be null in this case anyways
                      NetworkConfiguration: serviceInfo.networkConfiguration,
                      CapacityProviderStrategy: serviceInfo.capacityProviderStrategy
                    }
                  }
                }
              ]
            })
          }
        }
      })
    );
  } else {
    console.info(`[${ecsServiceName}] Starting rolling ECS Service deployment...`);
    await ecsClient.send(
      new UpdateServiceCommand({ service: ecsServiceArn, cluster: clusterName, forceNewDeployment: true })
    );
  }

  // after starting deployment we will manually update the capacity of ASG (double the momentary desired capacity) to initiate and speed up deployment.
  // after deployment is done, ECS Managed Scaling should scale down the capacity again automatically to meet the 100% utilization.
  const {
    AutoScalingGroups: [asgInfo]
  } = await autoscalingClient.send(
    new DescribeAutoScalingGroupsCommand({ AutoScalingGroupNames: [event.asgName as string] })
  );
  await autoscalingClient.send(
    new SetDesiredCapacityCommand({
      AutoScalingGroupName: asgInfo.AutoScalingGroupName,
      DesiredCapacity: Math.min(asgInfo.DesiredCapacity * 2, asgInfo.MaxSize)
    })
  );
};
