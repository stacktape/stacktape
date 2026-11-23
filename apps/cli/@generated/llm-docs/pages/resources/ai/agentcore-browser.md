# AgentCore Browser

An `agentcore-browser` is an Amazon Bedrock AgentCore Browser: a managed, isolated web browser your agent can drive to
read pages, fill in forms and click through sites. Use it with an [AgentCore Runtime](/resources/ai/agentcore-runtime)
when the agent has to work with real web pages.

If the agent only calls APIs, it doesn't need a browser: call them from the agent's code, or expose them through an
[AgentCore Gateway](/resources/ai/agentcore-gateway).

## Basic example


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreBrowser, AgentCoreRuntime, JsBundleImagePackaging } from 'stacktape';
export default defineConfig(() => {
  const browser = new AgentCoreBrowser({});

  const researchAgent = new AgentCoreRuntime({
    packaging: new JsBundleImagePackaging({ entryfilePath: './agent/server.ts' }),
    useBrowser: 'browser'
  });

  return {
    resources: { browser, researchAgent }
  };
});
```


`useBrowser` gives the runtime access to the browser and injects its ID as `STP_AGENTCORE_BROWSER_ID`. The agent starts a
browser session with that ID through the AgentCore SDK and drives it, for example with Playwright over the session's
automation endpoint:

```typescript
const browserId = process.env.STP_AGENTCORE_BROWSER_ID!;
```

The browser runs in AgentCore's public network mode, so it can open any site on the internet.

## Record sessions

`recording` saves browser sessions to an S3 bucket so you can replay what the agent did:


Example (TypeScript):

```typescript
import { defineConfig, AgentCoreBrowser, Bucket, $ResourceParam } from 'stacktape';

export default defineConfig(() => {
  const recordings = new Bucket({});
  const browser = new AgentCoreBrowser({
    recording: {
      enabled: true,
      bucketName: $ResourceParam('recordings', 'name'),
      prefix: 'sessions/'
    }
  });

  return {
    resources: { recordings, browser }
  };
});
```


Stacktape lets the browser write to that bucket and prefix. Recordings can contain whatever the agent saw, including
personal data, so set access and a lifecycle rule on the bucket to match your retention rules. For a bucket outside the
stack, pass its name as a string.

## Cost

AgentCore bills browser sessions per second for the CPU and memory they use. Recordings add S3 storage. See
[AgentCore pricing](https://aws.amazon.com/bedrock/agentcore/pricing/).

## Configuration reference


### Definition: `AgentCoreBrowserProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/agentcore` with definition name `AgentCoreBrowserProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `description` | no | `string` | - |
| `recording` | no | `unknown` | - |
| `tags` | no | `Array<CloudformationTag>` | - |


## Referenceable parameters

| Parameter | Value |
|---|---|
| `id` | Browser ID |
| `arn` | Browser ARN |

## Next steps

- [AgentCore Runtime](/resources/ai/agentcore-runtime): the agent that drives the browser.
- [AgentCore Code Interpreter](/resources/ai/agentcore-code-interpreter): let the agent run code instead.
