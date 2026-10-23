/** bun call.ts <stage> <function> '<json event>' — one invocation, printed as JSON. */
import { assertAccount, functionName, invoke } from './lib';
await assertAccount();
const [stage, fn, event] = process.argv.slice(2);
console.log(JSON.stringify(await invoke(functionName(stage, fn), JSON.parse(event ?? '{}')), null, 1));
