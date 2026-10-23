/** Forces cold starts with an environment change; records config-update time and Init Duration. Raw → coldstart.jsonl. */
import { GetFunctionConfigurationCommand, LambdaClient, UpdateFunctionConfigurationCommand } from '@aws-sdk/client-lambda';
import { assertAccount, functionName, invoke, record, REGION, summary } from './lib';
await assertAccount();
const lambda = new LambdaClient({ region: REGION });
const n = Number(process.env.N ?? 5);
for (const fn of ['benchArm', 'benchNoVpc']) {
  const name = functionName('box', fn);
  const init: number[] = [];
  const update: number[] = [];
  for (let i = 0; i < n; i++) {
    const config = await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: name }));
    const start = Date.now();
    await lambda.send(new UpdateFunctionConfigurationCommand({ FunctionName: name, Environment: { Variables: { ...config.Environment?.Variables, DEVBOX_COLD: `${Date.now()}` } } }));
    while ((await lambda.send(new GetFunctionConfigurationCommand({ FunctionName: name }))).LastUpdateStatus !== 'Successful') await new Promise((r) => setTimeout(r, 250));
    const updateS = (Date.now() - start) / 1000;
    const result = await invoke(name, { action: 'noop' });
    init.push(result.initMs);
    update.push(updateS);
    record('coldstart.jsonl', { fn, i, updateS, initMs: result.initMs, durationMs: result.durationMs, clientMs: result.clientMs });
  }
  console.log(fn, 'init ms', JSON.stringify(summary(init)), 'config update s', JSON.stringify(summary(update)));
}
