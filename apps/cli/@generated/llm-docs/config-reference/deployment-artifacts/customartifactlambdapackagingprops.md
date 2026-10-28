# CustomArtifactLambdaPackagingProps API Reference

## TypeScript definition

```typescript
type CustomArtifactLambdaPackagingProps = {
  /** The handler function to be executed when the Lambda is invoked. */
  handler: string;
  /** The path to a pre-built deployment package. */
  packagePath: string;
};
```

## Property: `handler`

- Required: yes
- Type: `string`

The handler function to be executed when the Lambda is invoked.

Required, like `runtime` on the Lambda resource.

The syntax is `{{filepath}}:{{functionName}}`, with the file's path inside the artifact: `handlers/process.js:main`
invokes `main` from `handlers/process.js`. Java and .NET handlers use Lambda's own format and are used as written:
`com.example.Handler::handleRequest` or `Assembly::Namespace.Class::Method`.

Example: `index.js:default`

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: custom-artifact
       properties:
         packagePath: ./dist/lambda.zip
         handler: index.js:default
     runtime: nodejs22.x
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'custom-artifact',
     properties: {
       packagePath: './dist/lambda.zip',
       handler: 'index.js:default'
     }
   },
   runtime: 'nodejs22.x',
   memory: 512
 });
 return { resources: { apiFunction } };
});
```

## Property: `packagePath`

- Required: yes
- Type: `string`

The path to a pre-built deployment package.

If the path points to a directory or a non-zip file, Stacktape will automatically zip it for you.

### Example 1 (yaml)

```yaml
resources:
 apiFunction:
   type: function
   properties:
     packaging:
       type: custom-artifact
       properties:
         packagePath: ./dist/lambda.zip
         handler: index.js:handler
     runtime: nodejs22.x
     memory: 512
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const apiFunction = new LambdaFunction({
   packaging: {
     type: 'custom-artifact',
     properties: {
       packagePath: './dist/lambda.zip',
       handler: 'index.js:handler'
     }
   },
   runtime: 'nodejs22.x',
   memory: 512
 });
 return { resources: { apiFunction } };
});
```
