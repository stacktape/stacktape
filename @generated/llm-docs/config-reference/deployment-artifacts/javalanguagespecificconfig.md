# JavaLanguageSpecificConfig API Reference

## TypeScript definition

```typescript
type JavaLanguageSpecificConfig = {
  /** The version of Java to use. */
  javaVersion?: 11 | 17 | 19 | 8;
  /** The path to your project&#39;s build file (pom.xml for Maven or build.gradle for Gradle). */
  packageManagerFile?: string;
  /** Specifies whether to use Maven instead of Gradle. */
  useMaven?: boolean;
};
```

## Property: `javaVersion`

- Required: no
- Type: `number: 11 | 17 | 19 | 8`
- Default: `11`

The version of Java to use.

### Example 1 (yaml)

```yaml
resources:
 javaApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/main/java/com/example/Handler.java
         languageSpecificConfig:
           javaVersion: 17
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const javaApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/main/java/com/example/Handler.java',
       languageSpecificConfig: {
         javaVersion: 17
       }
     }
   },
   memory: 1024
 });
 return { resources: { javaApi } };
});
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
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/main/java/com/example/Handler.java
         languageSpecificConfig:
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
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/main/java/com/example/Handler.java',
       languageSpecificConfig: {
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

By default, Stacktape uses Gradle to build Java projects.

### Example 1 (yaml)

```yaml
resources:
 javaApi:
   type: function
   properties:
     packaging:
       type: stacktape-lambda-buildpack
       properties:
         entryfilePath: src/main/java/com/example/Handler.java
         languageSpecificConfig:
           useMaven: true
     memory: 1024
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, defineConfig } from 'stacktape';

export default defineConfig(() => {
 const javaApi = new LambdaFunction({
   packaging: {
     type: 'stacktape-lambda-buildpack',
     properties: {
       entryfilePath: 'src/main/java/com/example/Handler.java',
       languageSpecificConfig: {
         useMaven: true
       }
     }
   },
   memory: 1024
 });
 return { resources: { javaApi } };
});
```
