# DotnetBuildpackConfig API Reference

.NET options of the Lambda buildpack.

## TypeScript definition

```typescript
type DotnetBuildpackConfig = {
  /** The path to your .NET project file (.csproj). */
  projectFile?: string;
};
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
       type: buildpack
       properties:
         entryfilePath: src/Function.cs
         dotnet:
           projectFile: src/Api.csproj
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const dotnetApi = new LambdaFunction({
   packaging: {
     type: 'buildpack',
     properties: {
       entryfilePath: 'src/Function.cs',
       dotnet: {
         projectFile: 'src/Api.csproj'
       }
     }
   },
   memory: 1024
 });
 return { resources: { dotnetApi } };
});
```
