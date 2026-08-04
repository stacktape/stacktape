# NamedScriptLifecycleHook API Reference

## TypeScript definition

```typescript
type NamedScriptLifecycleHook = {
  /** Script Name */
  scriptName: string;
  /** Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI). */
  skipOnCI?: boolean;
  /** Skip this hook when running locally; only run in CI/CD. */
  skipOnLocal?: boolean;
};
```

## Property: `scriptName`

- Required: yes
- Type: `string`

Script Name

The name of the script to execute. The script must be defined in the `scripts` section of your configuration.

### Example 1 (yaml)

```yaml
scripts:
  migrate:
    type: local-script
    properties:
      executeCommand: npm run migrate
      connectTo:
        - db
hooks:
  afterDeploy:
    - scriptName: migrate
resources:
  db:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('db-password')
      engine:
        type: mysql
        properties:
          version: '8.0.36'
          primaryInstance:
            instanceSize: db.t4g.micro
```

### Example 2 (typescript)

```typescript
import { RelationalDatabase, RdsEngineMysql, LocalScript, $Secret, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const db = new RelationalDatabase({
    credentials: { masterUserPassword: $Secret('db-password') },
    engine: new RdsEngineMysql({ version: '8.0.36', primaryInstance: { instanceSize: 'db.t4g.micro' } })
  });
  const migrate = new LocalScript({ executeCommand: 'npm run migrate', connectTo: [db] });

  return {
    scripts: { migrate },
    hooks: {
      afterDeploy: [
        { scriptName: 'migrate' }
      ]
    },
    resources: { db }
  };
});
```

## Property: `skipOnCI`

- Required: no
- Type: `boolean`
- Default: `false`

Skip this hook in CI/CD environments (CodeBuild, GitHub Actions, GitLab CI).

Useful for hooks that only make sense locally (e.g., opening a browser, interactive prompts).

### Example 1 (yaml)

```yaml
scripts:
  openBrowser:
    type: local-script
    properties:
      executeCommand: open http://localhost:3000
hooks:
  afterDeploy:
    - scriptName: openBrowser
      skipOnCI: true
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const openBrowser = new LocalScript({ executeCommand: 'open http://localhost:3000' });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return {
    scripts: { openBrowser },
    hooks: {
      afterDeploy: [
        { scriptName: 'openBrowser', skipOnCI: true }
      ]
    },
    resources: { web }
  };
});
```

## Property: `skipOnLocal`

- Required: no
- Type: `boolean`
- Default: `false`

Skip this hook when running locally; only run in CI/CD.

Useful for CI-only tasks (e.g., uploading test reports, notifying Slack).

### Example 1 (yaml)

```yaml
scripts:
  uploadTestReport:
    type: local-script
    properties:
      executeCommand: node ./scripts/upload-report.js
hooks:
  afterDeploy:
    - scriptName: uploadTestReport
      skipOnLocal: true
resources:
  web:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
```

### Example 2 (typescript)

```typescript
import { HostingBucket, LocalScript, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const uploadTestReport = new LocalScript({ executeCommand: 'node ./scripts/upload-report.js' });
  const web = new HostingBucket({ uploadDirectoryPath: './dist' });

  return {
    scripts: { uploadTestReport },
    hooks: {
      afterDeploy: [
        { scriptName: 'uploadTestReport', skipOnLocal: true }
      ]
    },
    resources: { web }
  };
});
```
