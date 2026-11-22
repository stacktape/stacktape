# AgentCore Code Interpreter

An `agentcore-code-interpreter` is an Amazon Bedrock AgentCore Code Interpreter: a managed sandbox where your agent runs
code it writes, for example to analyze a CSV file, do exact calculations or draw a chart. Use it with an
[AgentCore Runtime](/resources/ai/agentcore-runtime).

An agent that only calls APIs or queries your databases doesn't need it; give the runtime access with `connectTo`
instead. Long-running jobs belong in a [batch job](/resources/compute/batch-job).

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreCodeInterpreter, AgentCoreRuntime, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const codeInterpreter = new AgentCoreCodeInterpreter({});

  const analyst = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({ entryfilePath: './agent/server.ts' }),
    useCodeInterpreter: 'codeInterpreter'
  });

  return {
    resources: { codeInterpreter, analyst }
  };
});
```


`useCodeInterpreter` gives the runtime access to the interpreter and injects its ID as
`STP_AGENTCORE_CODE_INTERPRETER_ID`. The agent starts an interpreter session with that ID through the AgentCore SDK
and sends it code to run:

```typescript
const codeInterpreterId = process.env.STP_AGENTCORE_CODE_INTERPRETER_ID!;
```

The interpreter runs Python, JavaScript and TypeScript. The
[AgentCore documentation](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/) lists the preinstalled
libraries and session limits.

## Network and permissions

The sandbox runs in AgentCore's public network mode, so the code it runs can reach the internet. Its role allows every
`bedrock:*` and `bedrock-agentcore:*` action on all resources. Code that a model generates from user input runs with
those permissions, so treat what users can make the agent run as untrusted.

## Cost

AgentCore bills interpreter sessions per second for the CPU and memory they use. See
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/).

## Configuration reference


### Definition: `AgentCoreCodeInterpreterProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreCodeInterpreterProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `description` | no | `string` | - |
| `tags` | no | `Array<CloudformationTag>` | - |


## Referenceable parameters

| Parameter | Value |
|---|---|
| `id` | Code interpreter ID |
| `arn` | Code interpreter ARN |

## Next steps

- [AgentCore Runtime](/resources/ai/agentcore-runtime): the agent that sends the code.
- [AgentCore Browser](/resources/ai/agentcore-browser): let the agent use web pages.
