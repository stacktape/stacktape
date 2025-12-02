# Visibility timeout

The visibility timeout is the amount of time that a message is hidden from other consumers after it has been received. This prevents other consumers from processing the same message.

You can set the visibility timeout using the `visibilityTimeoutSeconds` property.

```yaml
resources:
  mainQueue:
    type: sqs-queue
    properties:
      visibilityTimeoutSeconds: 300
```