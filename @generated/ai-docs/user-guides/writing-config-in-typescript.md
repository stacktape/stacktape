# Writing Config in Typescript

In addition to YAML, you can write your Stacktape configuration in Javascript or Typescript. This is useful if you have a lot of dynamic behavior in your configuration.

## How to use a Javascript or Typescript config

Writing your configuration in Javascript or Typescript is straightforward. Just export your configuration as the default export:

```javascript
export default {
  // your configuration
};
```

When you run a CLI command, Stacktape will automatically look for a configuration file in the following order: `stacktape.yml`, `stacktape.json`, `stacktape.ts`, `stacktape.js`.

## Using Stacktape Typescript types

To improve your development experience, you can use the Typescript types provided by the `@stacktape/sdk` package.

First, install the package:

```bash
npm install @stacktape/sdk
```

or

```bash
yarn add @stacktape/sdk
```

For Javascript files, you can use JSDoc to get type hints:

```javascript
/** @type {import('@stacktape/sdk').StacktapeConfig} */
const config = {
  // your config
};

export default config;
```

For Typescript files, you can import the `StacktapeConfig` type:

```typescript
import { StacktapeConfig } from "@stacktape/sdk";

const config: StacktapeConfig = {
  // your config
};

export default config;
```

## Using the getConfig function

If your Typescript file exports a `getConfig` function, Stacktape will execute this function to generate your configuration. An object containing contextual information is passed as an argument to the function, which you can use to parameterize the returned configuration.

```typescript
import { StacktapeConfig, StacktapeArgs } from "@stacktape/sdk";

export const getConfig = (infoObject: {
  projectName: string;
  stage: string;
  region: string;
  command: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  cliArgs: StacktapeArgs;
}): StacktapeConfig => {
  // create your config and return it
};
```