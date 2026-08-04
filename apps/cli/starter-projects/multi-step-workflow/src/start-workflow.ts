import { Hono } from 'hono';
import { handle } from 'hono/aws-lambda';
import { SFNClient, StartExecutionCommand, DescribeExecutionCommand } from '@aws-sdk/client-sfn';

const sfn = new SFNClient({});
const stateMachineArn = process.env.STP_WORKFLOW_ARN!;

const app = new Hono();

app.post('/start', async (c) => {
  const input = await c.req.text() || '{}';
  const result = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn,
      input
    })
  );

  return c.json(
    {
      message: 'Workflow started',
      executionArn: result.executionArn,
      startDate: result.startDate?.toISOString()
    },
    202
  );
});

app.get('/status/:executionArn{.+}', async (c) => {
  const executionArn = decodeURIComponent(c.req.param('executionArn'));
  const result = await sfn.send(new DescribeExecutionCommand({ executionArn }));

  return c.json({
    status: result.status,
    input: result.input ? JSON.parse(result.input) : null,
    output: result.output ? JSON.parse(result.output) : null,
    startDate: result.startDate?.toISOString(),
    stopDate: result.stopDate?.toISOString()
  });
});

app.get('/', (c) => c.json({ message: 'Multi-step workflow API. POST /start to begin.' }));

export default handle(app);
