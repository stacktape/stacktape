# Archiving

Event buses support event archiving. You can replay an archive at any time, which is useful for recovering from errors or for testing.

```yaml
resources:
  myBus:
    type: event-bus
    properties:
      # {start-highlight}
      archivation:
        enabled: true
      # {stop-highlight}
```