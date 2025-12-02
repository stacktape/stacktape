# Alarm event

Triggers the function when a CloudWatch alarm enters the `ALARM` state. You can reference alarms created in the [Stacktape Console](https://console.stacktape.com/alarms) or directly in your configuration file.

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-mysql-serverless
      credentials:
        masterUserPassword: my-master-password
      alarms:
        # alarm fires when cpu utilization is higher than 80%
        - trigger:
            type: database-cpu-utilization
            properties:
              thresholdPercent: 80

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/cleanup-function.js'
      # {start-highlight}
      events:
        - type: cloudwatch-alarm
          properties:
            alarmName: myDatabase.alarms.0
      # {stop-highlight}
```

```yaml
resources:
  myDatabase:
    type: relational-database
    properties:
      engine:
        type: aurora-mysql-serverless
      credentials:
        masterUserPassword: my-master-password

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/cleanup-function.js'
      # {start-highlight}
      events:
        - type: cloudwatch-alarm
          properties:
            alarmName: myDatabase.alarms.CpuUtilization
      # {stop-highlight}
```