# Mounting to resources

You can mount a filesystem to a compute resource by specifying the `volumeMounts` property. Stacktape automatically handles the necessary network and _IAM_ permissions.

```yaml
resources:
  myEfsFilesystem:
    type: efs-filesystem

  myService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      # {start-highlight}
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: myEfsFilesystem
            mountPath: /mnt/my-mounted-system
      # {stop-highlight}
```

> Mounting a filesystem to a web service.

You can then access the mounted directory just like any other directory in your compute resource's filesystem.

```typescript
import * as fs from "fs";
import * as path from "path";

const mountPath = "/mnt/my-mounted-system";
const testFile = path.join(mountPath, "test.txt");

fs.writeFileSync(testFile, "Hello from EFS!");

const data = fs.readFileSync(testFile, "utf8");
// data is now "Hello from EFS!"
```

> An example of writing to and reading from a mounted filesystem.