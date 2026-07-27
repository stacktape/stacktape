# CdnLambdaFunctionOrigin API Reference

Resource type: `cdn`

## TypeScript definition

```typescript
type CdnLambdaFunctionOrigin = {
  /** Name of the function resource to route to. The function must have url.enabled: true. */
  functionName: string;
};
```

## Property: `functionName`

- Required: yes
- Type: `string`

Name of the `function` resource to route to. The function must have `url.enabled: true`.

### Example 1 (yaml)

```yaml
resources:
api:
  type: http-api-gateway
  properties:
    cdn:
      enabled: true
      routeRewrites:
        - path: /render/*
          routeTo:
            type: function
            properties:
              functionName: renderer
renderer:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./src/render.ts
    url:
      enabled: true
```

### Example 2 (typescript)

```typescript
import { HttpApiGateway, LambdaFunction, StacktapeLambdaBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
const renderer = new LambdaFunction({
  packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/render.ts' }),
  url: { enabled: true }
});
const api = new HttpApiGateway({
  cdn: {
    enabled: true,
    routeRewrites: [
      {
        path: '/render/*',
        routeTo: {
          type: 'function',
          properties: {
            functionName: 'renderer'
          }
        }
      }
    ]
  }
});
return { resources: { renderer, api } };
});
```
