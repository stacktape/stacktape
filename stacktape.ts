import yargs from 'yargs';
import {
  $ResourceParam,
  $Secret,
  Bastion,
  Bucket,
  defineConfig,
  DynamoDbTable,
  EfsFilesystem,
  HostingBucket,
  HttpApiGateway,
  LambdaFunction,
  LocalScript,
  LocalScriptWithBastionTunneling,
  MultiContainerWorkload,
  MultiContainerWorkloadHttpApiIntegration,
  RdsEnginePostgres,
  RelationalDatabase,
  StacktapeImageBuildpackPackaging,
  StacktapeLambdaBuildpackPackaging,
  UserAuthPool
} from './__release-npm';

const args = yargs(process.argv.slice(2)).parse();
const scriptArgs = yargs(args._).parse();

const PAYMENTS_SLACK_CHANNEL_ID = 'C04S29SHXAS';
const SUBSCRIPTIONS_SLACK_CHANNEL_ID = 'C04RNA8FSNP';
const SIGNUPS_SLACK_CHANNEL_ID = 'C04GBBXRLPP';
const USER_ERRORS_SLACK_CHANNEL_ID = 'C06ULPELC6Q';
const NEW_GITHUB_ISSUES_SLACK_CHANNEL_ID = 'C06JTDMRGMQ';
const APOLLO_IO_API_KEY = 'oJ-Z0aqHJl-kXTy7zjJ4AQ';

export default defineConfig(({ stage, region }) => {
  const apiDomain = stage === 'production' ? 'api.stacktape.com' : `${stage}-api.stacktape.com`;
  const consoleDomain = stage === 'production' ? 'console.stacktape.com' : `${stage}-console.stacktape.com`;
  const mcpDomain = stage === 'production' ? 'mcp.stacktape.com' : `${stage}-mcp.stacktape.com`;

  // Infrastructure Resources
  const mainApiGateway = new HttpApiGateway({
    customDomains: [{ domainName: apiDomain }]
  });

  const mainDatabase = new RelationalDatabase({
    engine: new RdsEnginePostgres({
      primaryInstance: {
        instanceSize: stage === 'production' ? 'db.t4g.small' : 'db.t4g.micro',
        multiAz: stage === 'production'
      },
      version: '15.14'
    }),
    credentials: {
      masterUserName: 'admin_user',
      masterUserPassword: $Secret('console-app-prod-db')
    },
    accessibility: {
      accessibilityMode: 'vpc',
      forceDisablePublicIp: true
    }
  });

  const pricingTable = new DynamoDbTable({
    primaryKey: {
      partitionKey: {
        name: 'productName',
        type: 'string'
      }
    }
  });

  const reportsBucket = new Bucket({});

  const mcpDocsBucket = new Bucket({});

  const bastionHost = new Bastion({});

  const apiServerFilesystem = new EfsFilesystem({
    throughputMode: 'elastic'
  });

  // Lambda Functions
  const cognitoCustomMessage = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/cognito-custom-message.ts'
    })
  });

  const mainUserPool = new UserAuthPool('mainUserPool', {
    userVerificationType: 'email-code',
    mfaConfiguration: {
      status: 'OPTIONAL',
      enabledTypes: ['SOFTWARE_TOKEN', 'SMS']
    },
    passwordPolicy: {
      minimumLength: 8
    },
    schema: [
      {
        name: 'fullName',
        attributeDataType: 'String',
        mutable: true
      },
      {
        name: 'correlationId',
        attributeDataType: 'String',
        mutable: false,
        required: false
      },
      {
        name: 'utm',
        attributeDataType: 'String',
        mutable: false,
        required: false
      }
    ],
    hooks: {
      postConfirmation: $ResourceParam('createUserPostSignUp', 'arn'),
      customMessage: $ResourceParam('cognitoCustomMessage', 'arn')
    },
    identityProviders: [
      {
        type: 'Google',
        clientId:
          stage === 'production'
            ? '586385958912-4g8u98f1jbgc22i5323orivo9gatuucg.apps.googleusercontent.com'
            : '586385958912-d6e1onsi8feqj587bk4pab2p54rbp40m.apps.googleusercontent.com',
        clientSecret: $Secret(`google-client-secret.${stage}`),
        attributeMapping: {
          email: 'email',
          'custom:fullName': 'name'
        }
      }
    ],
    callbackURLs: ['http://localhost:4000/auth-callback', `https://${consoleDomain}/auth-callback`],
    logoutURLs: ['http://localhost:4000/', `https://${consoleDomain}/`],
    overrides: {
      MainUserPoolUserPool: {
        'SmsConfiguration.ExternalId': `console-app-sms-external-id-${stage}`
      }
    }
  });

  const lambdaMcpServer = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/mcp-server/index.ts'
    }),
    provisionedConcurrency: 1,
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    },
    cdn: {
      enabled: true,
      customDomains: [{ domainName: mcpDomain }]
    }
  });

  const prismaProxy = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/prisma-proxy.ts'
    }),
    timeout: 30,
    joinDefaultVpc: true,
    connectTo: [mainDatabase]
  });

  const createUserPostSignUp = new LambdaFunction({
    memory: 1792,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/create-user-post-sign-up.ts'
    }),
    environment: {
      APOLLO_IO_API_KEY
    },
    connectTo: [prismaProxy]
  });

  const priceLoader = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/price-loader.ts'
    }),
    memory: 10240,
    storage: 10240,
    timeout: 900,
    connectTo: [pricingTable],
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'rate(1 day)'
        }
      }
    ]
  });

  const createMonthlyPayments = new LambdaFunction({
    timeout: 900,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/create-monthly-payments.ts'
    }),
    environment: {
      PADDLE_VENDOR_AUTH_CODE: $Secret('paddle-api-key'),
      STAGE: stage,
      SLACK_ACCESS_TOKEN: $Secret('slack-access-token'),
      SUBSCRIPTIONS_SLACK_CHANNEL_ID,
      PAYMENTS_SLACK_CHANNEL_ID
    },
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'cron(0 0 7 * ? *)'
        }
      }
    ],
    connectTo: [prismaProxy]
  });

  const paddleHooks = new LambdaFunction({
    timeout: 20,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/paddle-hooks.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'mainApiGateway',
          method: 'POST',
          path: '/paddle'
        }
      }
    ],
    connectTo: [prismaProxy],
    environment: {
      SLACK_ACCESS_TOKEN: $Secret('slack-access-token'),
      SUBSCRIPTIONS_SLACK_CHANNEL_ID,
      PAYMENTS_SLACK_CHANNEL_ID
    }
  });

  const handleEnterpriseFormSubmission = new LambdaFunction({
    timeout: 20,
    url: {
      enabled: true,
      cors: {
        enabled: true
      }
    },
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/handle-enterprise-form-submission.ts'
    }),
    environment: {
      SLACK_ACCESS_TOKEN: $Secret('slack-access-token')
    }
  });

  const handleGithubIssueCreate = new LambdaFunction({
    timeout: 20,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/handle-github-issue-create.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'mainApiGateway',
          method: 'POST',
          path: '/github-issue-create'
        }
      }
    ],
    connectTo: [prismaProxy],
    environment: {
      SLACK_ACCESS_TOKEN: $Secret('slack-access-token'),
      NEW_GITHUB_ISSUES_SLACK_CHANNEL_ID
    }
  });

  const githubApp = new LambdaFunction({
    memory: 3456,
    timeout: 900,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/github-app/index.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'mainApiGateway',
          method: 'POST',
          path: '/github-webhooks'
        }
      }
    ],
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage,
      GITHUB_APP_ID: 339030,
      GITHUB_APP_PRIVATE_KEY: $Secret('github-app-private-key'),
      GITHUB_APP_WEBHOOK_SECRET: $Secret('github-app-webhook-secret')
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const gitlabApp = new LambdaFunction({
    memory: 3456,
    timeout: 900,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/gitlab-app/index.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'mainApiGateway',
          method: 'POST',
          path: '/gitlab-webhooks'
        }
      }
    ],
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ],
    overrides: {
      GitlabAppFunction: {
        Layers: ['arn:aws:lambda:eu-west-1:977946299200:layer:git-layer:1']
      }
    }
  });

  const bitbucketApp = new LambdaFunction({
    memory: 3456,
    timeout: 900,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/bitbucket-app/index.ts'
    }),
    events: [
      {
        type: 'http-api-gateway',
        properties: {
          httpApiGatewayName: 'mainApiGateway',
          method: 'POST',
          path: '/bitbucket-webhooks'
        }
      }
    ],
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage,
      BITBUCKET_APP_PASSWORD: $Secret(`bitbucket-app-password.${stage}`)
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const remoteDeploy = new LambdaFunction({
    timeout: 900,
    memory: 3456,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/remote-deploy-github.ts'
    }),
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage,
      GITHUB_APP_ID: 339030,
      GITHUB_APP_PRIVATE_KEY: $Secret('github-app-private-key'),
      GITHUB_APP_WEBHOOK_SECRET: $Secret('github-app-webhook-secret')
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const remoteDeployGitlab = new LambdaFunction({
    timeout: 900,
    memory: 3456,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/remote-deploy-gitlab.ts'
    }),
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ],
    overrides: {
      RemoteDeployGitlabFunction: {
        Layers: ['arn:aws:lambda:eu-west-1:977946299200:layer:git-layer:1']
      }
    }
  });

  const remoteDeployBitbucket = new LambdaFunction({
    timeout: 900,
    memory: 3456,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/remote-deploy-bitbucket.ts'
    }),
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const remoteDelete = new LambdaFunction({
    timeout: 900,
    memory: 3456,
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/remote-delete.ts'
    }),
    connectTo: [prismaProxy],
    environment: {
      STAGE: stage
    },
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const dailyMaintenance = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/daily-maintenance.ts'
    }),
    environment: {
      SLACK_ACCESS_TOKEN: $Secret('slack-access-token'),
      SUBSCRIPTIONS_SLACK_CHANNEL_ID
    },
    events: [
      {
        type: 'schedule',
        properties: {
          scheduleRate: 'cron(1 0 * * ? *)'
        }
      }
    ],
    connectTo: [prismaProxy],
    timeout: 300
  });

  const handleAccountConnection = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/handle-account-connection.ts'
    }),
    connectTo: [prismaProxy],
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ],
    timeout: 300
  });

  const handleReportNotification = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/handle-report-notification.ts'
    }),
    timeout: 300,
    environment: {
      REPORTS_BUCKET: $ResourceParam('reportsBucket', 'name')
    },
    connectTo: [reportsBucket, prismaProxy],
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const handleBillingAttribution = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './server/lambdas/handle-billing-attribution.ts'
    }),
    timeout: 900,
    memory: 10240,
    events: [
      {
        type: 's3',
        properties: {
          bucketArn: $ResourceParam('reportsBucket', 'arn'),
          s3EventType: 's3:ObjectCreated:*',
          filterRule: {
            suffix: '00001.csv.gz'
          }
        }
      }
    ],
    connectTo: [reportsBucket, prismaProxy],
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      }
    ]
  });

  const webBucket = new HostingBucket({
    uploadDirectoryPath: './dist',
    excludeFilesPatterns: ['**/*.js.map'],
    hostingContentType: 'single-page-app',
    customDomains: [{ domainName: consoleDomain }],
    writeDotenvFilesTo: './',
    injectEnvironment: [
      {
        name: 'VITE_USERPOOL_ID',
        value: $ResourceParam('mainUserPool', 'id')
      },
      {
        name: 'VITE_USERPOOL_CLIENT_ID',
        value: $ResourceParam('mainUserPool', 'clientId')
      },
      {
        name: 'VITE_USERPOOL_DOMAIN',
        value: $ResourceParam('mainUserPool', 'domain')
      },
      {
        name: 'VITE_API_URL',
        value: $ResourceParam('mainApiGateway', 'customDomainUrl')
      },
      {
        name: 'VITE_PADDLE_VENDOR_ID',
        value: stage === 'production' ? 158297 : 8882
      },
      {
        name: 'VITE_PADDLE_SUBSCRIPTION_PLAN_ID',
        value: stage === 'production' ? 839250 : 38255
      },
      {
        name: 'VITE_STAGE',
        value: stage
      }
    ]
  });

  const apiServer = new MultiContainerWorkload({
    containers: [
      {
        name: 'api-container',
        packaging: new StacktapeImageBuildpackPackaging({
          entryfilePath: './server/index.ts',
          customDockerBuildCommands: ['apk add --no-cache git']
        }),
        events: [
          new MultiContainerWorkloadHttpApiIntegration({
            containerPort: 3000,
            httpApiGatewayName: 'mainApiGateway',
            method: '*',
            path: '/{proxy+}'
          })
        ],
        environment: {
          PORT: '3000',
          STAGE: stage,
          PADDLE_VENDOR_AUTH_CODE: $Secret('paddle-api-key'),
          GITHUB_APP_ID: 339030,
          GITHUB_APP_PRIVATE_KEY: $Secret('github-app-private-key'),
          GITHUB_APP_WEBHOOK_SECRET: '3cEE6mCzJypEyvUVPKuT',
          REMOTE_DEPLOY_LAMBDA_NAME: `console-app-${stage}-remoteDeploy`,
          REMOTE_DEPLOY_GITLAB_LAMBDA_NAME: `console-app-${stage}-remoteDeployGitlab`,
          REMOTE_DEPLOY_BITBUCKET_LAMBDA_NAME: `console-app-${stage}-remoteDeployBitbucket`,
          REMOTE_DELETE_LAMBDA_NAME: `console-app-${stage}-remoteDelete`,
          APOLLO_IO_API_KEY,
          PRICING_TABLE_NAME: $ResourceParam('pricingTable', 'name'),
          USER_ERRORS_SLACK_CHANNEL_ID,
          SIGNUPS_SLACK_CHANNEL_ID,
          SLACK_ACCESS_TOKEN: $Secret('slack-access-token'),
          GITLAB_APP_SECRET: $Secret(`gitlab-app-secret.${stage}`),
          BITBUCKET_APP_PASSWORD: $Secret(`bitbucket-app-password.${stage}`),
          STP_CUSTOM_TRPC_API_ENDPOINT: apiDomain,
          API_DOMAIN_URL: $ResourceParam('mainApiGateway', 'customDomainUrl'),
          STP_INVOKED_FROM: 'server',
          OPEN_ROUTER_API_KEY: $Secret('open-router-api-key')
        }
      }
    ],
    resources: {
      cpu: stage === 'production' ? 1 : 0.5,
      memory: stage === 'production' ? 2048 : 2048
    },
    connectTo: [mainDatabase, mainUserPool, pricingTable, 'aws:ses'],
    iamRoleStatements: [
      {
        Resource: ['arn:aws:iam::*:role/stacktape-*'],
        Action: ['sts:AssumeRole']
      },
      {
        Resource: ['arn:aws:route53:::hostedzone/Z04215881CRP1YWPXYIM6'],
        Action: ['route53:ChangeResourceRecordSets']
      },
      {
        Resource: ['*'],
        Action: ['es:Describe*']
      },
      {
        Resource: ['*'],
        Action: ['ec2:Describe*']
      }
    ]
  });

  return {
    resources: {
      mainApiGateway,
      mainDatabase,
      pricingTable,
      reportsBucket,
      bastionHost,
      apiServerFilesystem,
      cognitoCustomMessage,
      mainUserPool,
      createUserPostSignUp,
      prismaProxy,
      priceLoader,
      createMonthlyPayments,
      paddleHooks,
      handleEnterpriseFormSubmission,
      handleGithubIssueCreate,
      githubApp,
      gitlabApp,
      bitbucketApp,
      remoteDeploy,
      remoteDeployGitlab,
      remoteDeployBitbucket,
      remoteDelete,
      dailyMaintenance,
      handleAccountConnection,
      handleReportNotification,
      handleBillingAttribution,
      webBucket,
      apiServer,
      lambdaMcpServer,
      mcpDocsBucket
    },
    hooks: {
      beforeDeploy: [{ scriptName: 'generatePrismaClient' }],
      afterDeploy: [{ scriptName: 'migrateDb' }]
    },
    scripts: {
      studio: new LocalScriptWithBastionTunneling({
        executeCommand: 'bunx prisma studio --config prisma.config.ts',
        cwd: './prisma',
        connectTo: [mainDatabase]
      }),
      generatePrismaClient: new LocalScript({
        executeCommand: 'bunx prisma generate --schema prisma/schema.prisma'
      }),
      uniscript: new LocalScriptWithBastionTunneling({
        executeScript: 'scripts/universal.ts',
        connectTo: [mainDatabase, prismaProxy]
      }),
      migrateDb: new LocalScriptWithBastionTunneling({
        executeCommand: 'bunx prisma db push --config prisma/prisma.config.ts',
        connectTo: [mainDatabase]
      }),
      migrateDbDev: new LocalScriptWithBastionTunneling({
        executeCommand: 'bunx prisma db push --accept-data-loss --config prisma/prisma.config.ts',
        connectTo: [mainDatabase]
      }),
      invokePriceLoader: new LocalScript({
        executeScript: 'scripts/invoke-price-loader.ts',
        connectTo: [priceLoader],
        environment: {
          AWS_REGION: region
        }
      }),
      cleanupProjects: new LocalScriptWithBastionTunneling({
        executeScript: 'scripts/cleanup-projects.ts',
        connectTo: [mainDatabase],
        environment: {
          STAGE: stage
        }
      }),
      printSpend: new LocalScriptWithBastionTunneling({
        executeScript: 'scripts/print-spend.ts',
        connectTo: [mainDatabase],
        environment: {
          MONTH: scriptArgs.month || 'current'
        }
      }),
      printCustomerOps: new LocalScriptWithBastionTunneling({
        executeScript: 'scripts/print-customer-stack-operations.ts',
        connectTo: [mainDatabase],
        environment: {
          TYPE: scriptArgs.type || 'successful'
        }
      })
    },
    cloudformationResources: {
      HandleAccountConnectionLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: '*',
          FunctionName: $ResourceParam('handleAccountConnection', 'arn')
        }
      },
      HandleReportNotificationLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: 's3.amazonaws.com',
          FunctionName: $ResourceParam('handleReportNotification', 'arn')
        }
      },
      RemoteDeployLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: '*',
          FunctionName: $ResourceParam('remoteDeploy', 'arn')
        }
      },
      RemoteDeployGitlabLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: '*',
          FunctionName: $ResourceParam('remoteDeployGitlab', 'arn')
        }
      },
      RemoteDeployBitbucketLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: '*',
          FunctionName: $ResourceParam('remoteDeployBitbucket', 'arn')
        }
      },
      RemoteDeleteLambdaPermission: {
        Type: 'AWS::Lambda::Permission',
        Properties: {
          Action: 'lambda:InvokeFunction',
          Principal: '*',
          FunctionName: $ResourceParam('remoteDelete', 'arn')
        }
      }
    }
  };
});
