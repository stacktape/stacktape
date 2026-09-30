# JavaBuildpackConfig API Reference

Java options of the Lambda buildpack.

## TypeScript definition

```typescript
type JavaBuildpackConfig = {
  /** The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle). */
  packageManagerFile?: string;
  /** Specifies whether to use Maven instead of Gradle. */
  useMaven?: boolean;
};
```

## Property: `packageManagerFile`

- Required: no
- Type: `string`

The path to your project's build file (`pom.xml` for Maven or `build.gradle` for Gradle).

### Example 1 (yaml)

```yaml
resources:
 javaApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: src/main/java/com/example/Handler.java
         java:
           useMaven: true
           packageManagerFile: pom.xml
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const javaApi = new LambdaFunction({
   packaging: {
     type: 'buildpack',
     properties: {
       entryfilePath: 'src/main/java/com/example/Handler.java',
       java: {
         useMaven: true,
         packageManagerFile: 'pom.xml'
       }
     }
   },
   memory: 1024
 });
 return { resources: { javaApi } };
});
```

## Property: `useMaven`

- Required: no
- Type: `boolean`

Specifies whether to use Maven instead of Gradle.

By default, Stacktape uses Maven when the project's nearest build file is a `pom.xml`, and Gradle otherwise.

### Example 1 (yaml)

```yaml
resources:
 javaApi:
   type: function
   properties:
     packaging:
       type: buildpack
       properties:
         entryfilePath: src/main/java/com/example/Handler.java
         java:
           useMaven: true
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const javaApi = new LambdaFunction({
   packaging: {
     type: 'buildpack',
     properties: {
       entryfilePath: 'src/main/java/com/example/Handler.java',
       java: {
         useMaven: true
       }
     }
   },
   memory: 1024
 });
 return { resources: { javaApi } };
});
```
