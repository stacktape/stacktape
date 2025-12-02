# Limit access

You can limit a resource's access to a specific directory within the filesystem by specifying a `rootDirectory`.

```yaml
resources:
  myEfsFilesystem:
    type: efs-filesystem

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/read-write-efs.ts
      joinDefaultVpc: true
      volumeMounts:
        - type: efs
          properties:
            efsFilesystemName: myEfsFilesystem
            mountPath: /mnt/my-mounted-system
            # {start-highlight}
            rootDirectory: /my/root/directory
            # {stop-highlight}
```

> A Lambda function with limited access to a filesystem.