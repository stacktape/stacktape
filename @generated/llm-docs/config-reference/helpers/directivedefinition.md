# DirectiveDefinition API Reference

## TypeScript definition

```typescript
type DirectiveDefinition = {
  /** File Path */
  filePath: string;
  /** Directive Name */
  name: string;
};
```

## Property: `filePath`

- Required: yes
- Type: `string`

File Path

The path to the file where the directive is defined, in the format `{file-path}:{handler}`.

If the `{handler}` is omitted:

For `.js` and `.ts` files, the `default` export is used.
For `.py` files, the `main` function is used.

### Example 1 (yaml)

```yaml
directives:
  - name: GetCommitSha
    filePath: directives/git.ts:getCommitSha
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      environment:
        - name: COMMIT_SHA
          value: $GetCommitSha()
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    environment: { COMMIT_SHA: '$GetCommitSha()' }
  });

  return {
    directives: [
      {
        name: 'GetCommitSha',
        filePath: 'directives/git.ts:getCommitSha'
      }
    ],
    resources: { api }
  };
});
```

## Property: `name`

- Required: yes
- Type: `string`

Directive Name

The name of the custom directive.

### Example 1 (yaml)

```yaml
directives:
  - name: GetCommitSha
    filePath: directives/git.ts:getCommitSha
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      environment:
        - name: COMMIT_SHA
          value: $GetCommitSha()
```

### Example 2 (typescript)

```typescript
import { WebService, StacktapeImageBuildpackPackaging, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const api = new WebService({
    packaging: new StacktapeImageBuildpackPackaging({ entryfilePath: 'src/server.ts' }),
    resources: { cpu: 0.25, memory: 512 },
    environment: { COMMIT_SHA: '$GetCommitSha()' }
  });

  return {
    directives: [{ name: 'GetCommitSha', filePath: 'directives/git.ts:getCommitSha' }],
    resources: { api }
  };
});
```
