import {
  HttpApiGateway,
  HttpApiIntegration,
  LambdaFunction,
  StacktapeLambdaBuildpackPackaging,
  StateMachine,
  defineConfig
} from '../../__release-npm';

export default defineConfig(() => {
  const apiGateway = new HttpApiGateway({
    cors: {
      enabled: true
    }
  });
  const validateInput = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/validate-input.ts'
    })
  });
  const processData = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/process-data.ts'
    })
  });
  const generateReport = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/generate-report.ts'
    })
  });
  const workflow = new StateMachine({
    definition: {
      Comment: 'Multi-step data processing workflow',
      StartAt: 'ValidateInput',
      States: {
        ValidateInput: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['ValidateInputFunction', 'Arn'] },
          Next: 'IsValid',
          Catch: [{ ErrorEquals: ['States.ALL'], Next: 'Failed' }]
        },
        IsValid: {
          Type: 'Choice',
          Choices: [{ Variable: '$.valid', BooleanEquals: true, Next: 'ProcessData' }],
          Default: 'Failed'
        },
        ProcessData: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['ProcessDataFunction', 'Arn'] },
          Next: 'GenerateReport',
          Retry: [{ ErrorEquals: ['States.TaskFailed'], IntervalSeconds: 2, MaxAttempts: 2, BackoffRate: 2 }],
          Catch: [{ ErrorEquals: ['States.ALL'], Next: 'Failed' }]
        },
        GenerateReport: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['GenerateReportFunction', 'Arn'] },
          End: true,
          Catch: [{ ErrorEquals: ['States.ALL'], Next: 'Failed' }]
        },
        Failed: {
          Type: 'Fail',
          Error: 'WorkflowFailed',
          Cause: 'One or more steps failed'
        }
      }
    }
  });
  const startWorkflow = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({
      entryfilePath: './src/start-workflow.ts'
    }),
    memory: 512,
    connectTo: [workflow],
    events: [
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/start',
        method: 'POST'
      }),
      new HttpApiIntegration({
        httpApiGatewayName: 'apiGateway',
        path: '/status/{executionArn+}',
        method: 'GET'
      })
    ]
  });

  return {
    resources: { apiGateway, validateInput, processData, generateReport, workflow, startWorkflow }
  };
});
