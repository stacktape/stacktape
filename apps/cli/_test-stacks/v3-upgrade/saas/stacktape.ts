/**
 * The backend of stacktape.v3.ts after the migration the v4 upgrade note asks for, and nothing else: the `stacktape`
 * package moves to v4, the packaging classes are renamed (`StacktapeImageBuildpackPackaging` -> `JsBundleImagePackaging`,
 * `StacktapeLambdaBuildpackPackaging` -> `JsBundleLambdaPackaging`, `CustomDockerfilePackaging` -> `DockerfilePackaging`)
 * and alarms' `notificationTargets` become `notificationChannels`. It also adds the backend's two batch jobs, which
 * 3.7.1 can no longer create (see stacktape.v3.ts), so the canary still runs a batch job after the upgrade. scripts/real-aws/v3-upgrade-canary.ts deploys it with
 * the current CLI over the stack that 3.7.1 created.
 *
 * The canary replaces __OWNER__, __RUNNER_IP__ and __SECRET_NAME__ in its copy of this file.
 */
import {
  $CfResourceParam,
  $ResourceParam,
  $Secret,
  ApplicationLoadBalancer,
  ApplicationLoadBalancerIntegration,
  BatchJob,
  DockerfilePackaging,
  defineConfig,
  HostingBucket,
  LambdaErrorRateTrigger,
  LambdaFunction,
  MultiContainerWorkload,
  ScheduleIntegration,
  SqsIntegration,
  SqsQueue,
  JsBundleImagePackaging,
  JsBundleLambdaPackaging
} from 'stacktape';

const partnerApiKey = { PARTNER_API_KEY: $Secret('__SECRET_NAME__.partnerApiKey') };
const databaseHost = $CfResourceParam('AuroraPostgresDatabaseDBCluster', 'Endpoint.Address');

const alarmed = (
  entryfilePath: string,
  extra: { events?: (ScheduleIntegration | ApplicationLoadBalancerIntegration)[] } = {}
) =>
  new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath }),
    environment: partnerApiKey,
    alarms: [
      {
        trigger: new LambdaErrorRateTrigger({ thresholdPercent: 5 }),
        notificationChannels: [{ type: 'webhook', properties: { url: $ResourceParam('alarmSink', 'url') } }]
      }
    ],
    ...extra
  });

export default defineConfig(() => {
  const mainLoadBalancer = new ApplicationLoadBalancer({
    listeners: [
      { protocol: 'HTTP', port: 80 },
      { protocol: 'HTTP', port: 8080, whitelistIps: ['__RUNNER_IP__/32'] }
    ]
  });

  const apiServer = new MultiContainerWorkload({
    resources: { cpu: 0.25, memory: 512 },
    scaling: { minInstances: 1, maxInstances: 2 },
    containers: [
      {
        name: 'graphql-api',
        packaging: new JsBundleImagePackaging({ entryfilePath: './src/api/server.ts' }),
        environment: { ...partnerApiKey, DATABASE_HOST: databaseHost },
        events: [
          {
            type: 'application-load-balancer',
            properties: {
              containerPort: 3000,
              loadBalancerName: 'mainLoadBalancer',
              listenerPort: 80,
              priority: 10,
              paths: ['/graphql*']
            }
          }
        ],
        loadBalancerHealthCheck: { healthcheckPath: '/health' }
      },
      {
        name: 'metrics-agent',
        essential: false,
        packaging: new DockerfilePackaging({ buildContextPath: './sidecar' })
      }
    ]
  });

  const appUi = new HostingBucket({
    uploadDirectoryPath: './app-ui',
    hostingContentType: 'single-page-app',
    routeRewrites: [
      {
        path: '/graphql*',
        routeTo: {
          type: 'application-load-balancer',
          properties: { loadBalancerName: 'mainLoadBalancer', listenerPort: 80 }
        }
      }
    ]
  });

  const jobsQueue = new SqsQueue({});
  const webhookQueue = new SqsQueue({});

  const notifierJob = new BatchJob({
    container: { packaging: new JsBundleImagePackaging({ entryfilePath: './src/jobs/notifier.ts' }) },
    resources: { cpu: 1, memory: 512 },
    timeout: 600,
    events: [new SqsIntegration({ sqsQueueName: 'jobsQueue', batchSize: 1 })]
  });
  const syncUsersJob = new BatchJob({
    container: { packaging: new DockerfilePackaging({ buildContextPath: './sync-job' }) },
    resources: { cpu: 1, memory: 512 },
    timeout: 600,
    events: [new ScheduleIntegration({ scheduleRate: 'rate(7 days)' })]
  });

  const alarmSink = new LambdaFunction({
    packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/functions/alarmSink.ts' }),
    url: { enabled: true, authMode: 'NONE' }
  });

  return {
    resources: {
      mainLoadBalancer,
      apiServer,
      appUi,
      jobsQueue,
      webhookQueue,
      notifierJob,
      syncUsersJob,
      alarmSink,
      cardPull: alarmed('./src/functions/cardPull.ts', {
        events: [new ScheduleIntegration({ scheduleRate: 'rate(1 day)' })]
      }),
      webhookWorker: alarmed('./src/functions/webhookWorker.ts'),
      codeMinter: alarmed('./src/functions/codeMinter.ts'),
      tokenRefreshWorker: alarmed('./src/functions/tokenRefreshWorker.ts'),
      maintenance: alarmed('./src/functions/maintenance.ts', {
        events: [
          new ApplicationLoadBalancerIntegration({
            loadBalancerName: 'mainLoadBalancer',
            listenerPort: 8080,
            priority: 1,
            paths: ['/admin/*']
          })
        ]
      }),
      reportExporter: alarmed('./src/functions/reportExporter.ts'),
      inviteSender: new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/functions/inviteSender.ts' }),
        environment: partnerApiKey
      }),
      webhookIngress: new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/functions/webhookIngress.ts' }),
        events: [
          new ApplicationLoadBalancerIntegration({
            loadBalancerName: 'mainLoadBalancer',
            listenerPort: 80,
            priority: 20,
            paths: ['/hooks/*']
          })
        ]
      }),
      queueConsumer: new LambdaFunction({
        packaging: new JsBundleLambdaPackaging({ entryfilePath: './src/functions/queueConsumer.ts' }),
        events: [new SqsIntegration({ sqsQueueName: 'webhookQueue', batchSize: 1 })]
      })
    },
    scripts: {
      migrate: {
        type: 'local-script',
        properties: {
          executeCommand: 'node scripts/migrate.mjs',
          environment: [
            { name: 'DATABASE_HOST', value: databaseHost },
            { name: 'DATABASE_PASSWORD', value: $Secret('__SECRET_NAME__.dbPassword') }
          ]
        }
      }
    },
    hooks: { afterDeploy: [{ scriptName: 'migrate' }] },
    cloudformationResources: {
      AuroraDbSubnetGroup: {
        Type: 'AWS::RDS::DBSubnetGroup',
        Properties: {
          DBSubnetGroupDescription: 'Application database',
          SubnetIds: [{ Ref: 'StpPublicSubnet0' }, { Ref: 'StpPublicSubnet1' }]
        }
      },
      AuroraDbSecurityGroup: {
        Type: 'AWS::EC2::SecurityGroup',
        Properties: {
          GroupDescription: 'Application database',
          VpcId: { Ref: 'StpVpc' },
          SecurityGroupIngress: [
            { IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432, CidrIp: '__RUNNER_IP__/32' },
            { IpProtocol: 'tcp', FromPort: 5432, ToPort: 5432, CidrIp: { 'Fn::GetAtt': ['StpVpc', 'CidrBlock'] } }
          ]
        }
      },
      AuroraPostgresDatabaseDBCluster: {
        Type: 'AWS::RDS::DBCluster',
        Properties: {
          Engine: 'aurora-postgresql',
          EngineVersion: '16.8',
          DatabaseName: 'app',
          MasterUsername: 'app_admin',
          MasterUserPassword: $Secret('__SECRET_NAME__.dbPassword'),
          DBSubnetGroupName: { Ref: 'AuroraDbSubnetGroup' },
          VpcSecurityGroupIds: [{ Ref: 'AuroraDbSecurityGroup' }],
          ServerlessV2ScalingConfiguration: { MinCapacity: 0.5, MaxCapacity: 1 },
          BackupRetentionPeriod: 1,
          StorageEncrypted: true
        }
      },
      AuroraPostgresDatabaseInstance: {
        Type: 'AWS::RDS::DBInstance',
        Properties: {
          DBClusterIdentifier: { Ref: 'AuroraPostgresDatabaseDBCluster' },
          DBInstanceClass: 'db.serverless',
          Engine: 'aurora-postgresql',
          PubliclyAccessible: true
        }
      },
      AuroraPostgresDatabaseCpuAlarm: {
        Type: 'AWS::CloudWatch::Alarm',
        Properties: {
          AlarmDescription: 'Application database CPU above 80%',
          Namespace: 'AWS/RDS',
          MetricName: 'CPUUtilization',
          Dimensions: [{ Name: 'DBClusterIdentifier', Value: { Ref: 'AuroraPostgresDatabaseDBCluster' } }],
          Statistic: 'Average',
          Period: 300,
          EvaluationPeriods: 3,
          Threshold: 80,
          ComparisonOperator: 'GreaterThanThreshold'
        }
      }
    },
    stackConfig: { tags: [{ name: 'stacktape-canary-owner', value: '__OWNER__' }] }
  };
});
