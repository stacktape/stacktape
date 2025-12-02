# FIFO

You can enable FIFO (First-In, First-Out) to ensure that messages are processed in the exact order that they are sent.

```yaml
resources:
  mainQueue:
    type: sqs-queue
    properties:
      fifoEnabled: true
```