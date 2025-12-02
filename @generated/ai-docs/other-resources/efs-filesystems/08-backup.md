# Backup

You can enable daily backups to protect your data against accidental deletion.

```yaml
resources:
  myFileSystem:
    type: efs-filesystem
    properties:
      # {start-highlight}
      backupEnabled: true
      # {stop-highlight}
```