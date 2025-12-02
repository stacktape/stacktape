# FIFO

You can enable FIFO (First-In, First-Out) to ensure that messages are processed in the exact order that they are sent.

```yaml
resources:
  mainTopic:
    type: sns-topic
    properties:
      fifoEnabled: true
```