# Custom commands on launch

You can run a custom set of commands when the bastion server is launched using the `runCommandsAtLaunch` property. This is useful for installing dependencies or performing other setup tasks.

```yaml
resources:
  myBastion:
    type: bastion
    properties:
      # {start-highlight}
      runCommandsAtLaunch:
        - yum update
        - yum install postgresql.x86_64 -y
      # {stop-highlight}
```