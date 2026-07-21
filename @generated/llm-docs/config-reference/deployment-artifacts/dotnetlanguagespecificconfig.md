# DotnetLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type DotnetLanguageSpecificConfig = {
  /** The version of .NET to use. */
  dotnetVersion?: 6 | 8;
  /** The path to your .NET project file (.csproj). */
  projectFile?: string;
};
```

## Property: `dotnetVersion`

- Required: no
- Type: `number: 6 | 8`
- Default: `8`

The version of .NET to use.

### Example 1 (yaml)

```yaml
resources:
 dotnetApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/Function.cs
         languageSpecificConfig:
           projectFile: src/Api.csproj
           dotnetVersion: 8
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const dotnetApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/Function.cs',
       languageSpecificConfig: {
         projectFile: 'src/Api.csproj',
         dotnetVersion: 8
       }
     }
   },
   memory: 1024
 });
 return { resources: { dotnetApi } };
});
```

## Property: `projectFile`

- Required: no
- Type: `string`

The path to your .NET project file (.csproj).

### Example 1 (yaml)

```yaml
resources:
 dotnetApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/Function.cs
         languageSpecificConfig:
           projectFile: src/Api.csproj
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const dotnetApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/Function.cs',
       languageSpecificConfig: {
         projectFile: 'src/Api.csproj'
       }
     }
   },
   memory: 1024
 });
 return { resources: { dotnetApi } };
});
```
