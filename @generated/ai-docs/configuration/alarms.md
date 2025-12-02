# Alarms

Alarms offer a straightforward way to monitor your infrastructure and receive prompt notifications when your resources experience issues or become overloaded.

You can configure alarms to monitor specific metrics of a resource type. When a metric crosses a predefined threshold, the alarm triggers a configured action, such as sending a notification.

Under the hood, Stacktape alarms are implemented using _CloudWatch Alarm_s.

## How to create alarms

There are two ways to create alarms:

*   **Global alarms** are created in the Stacktape Console and apply to all resources of a specific type managed by Stacktape.
*   **In-config alarms** are defined directly within a resource's configuration in your `stacktape.yml` file.

## Global alarms

Global alarms are templates created in the [Stacktape Console](https://console.stacktape.com/alarms). When you deploy a stack that matches the alarm's `serviceName` and `stage` criteria, Stacktape creates a concrete alarm for each eligible resource in that stack.

When configuring a global alarm, you can specify:

*   The resource type and metric to monitor.
*   The threshold for the metric.
*   Automatic **Slack** or **email** notifications.
*   The stacks the alarm applies to, based on `serviceName` and `stage`.

### Creating a global alarm

1.  Navigate to the [Alarms page](https://console.stacktape.com/alarms) in the Stacktape Console and click **Create new alarm**.

    

2.  Configure the alarm. The example below shows an alarm that monitors the error rate of Lambda functions and is limited to the `prod` stage.

    

3.  Deploy your stack using the `stacktape deploy` command to create the alarms.

## In-config alarms

You can define alarms directly in your `stacktape.yml` file as a property of the resource you want to monitor.

```yaml
resources:
  myLambdaFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/js-lambda.js'
      # {start-highlight}
      alarms:
        - trigger:
            type: lambda-error-rate
            properties:
              thresholdPercent: 5
          notificationTargets:
            - type: slack
              properties:
                conversationId: C038XXXXXX
                accessToken: $Secret('slack-access-token')
      # {stop-highlight}
```

An in-config alarm consists of three parts:

*   **Trigger**: Specifies the metric to monitor.
*   **Notifications** (optional): Defines where to send notifications when the alarm is triggered.
*   **Evaluation** (optional): Configures the evaluation period for the monitored metric.

### Trigger

The trigger specifies the metric to be monitored.

```yml
resources:
  myLambdaFunction:
    type: function
# ...
# {start-highlight}
    alarms:
      - trigger:
          type: lambda-error-rate
          properties:
            thresholdPercent: 5
# {stop-highlight}
```

### Notifications

You can configure notifications to be sent to Slack, MS Teams, or by email.

**Slack:**

```yml
resources:
  myResource:
    type: ...
    properties:
# ...
      alarms:
        - trigger:
# ...
# {start-highlight}
          notificationTargets:
            - type: slack
              properties:
                conversationId: C038XXXXXX
                accessToken: $Secret('slack-access-token')
# {stop-highlight}
```

**MS Teams:**

```yml
resources:
  myResource:
    type: ...
    properties:
# ...
      alarms:
        - trigger:
# ...
# {start-highlight}
          notificationTargets:
            - type: ms-teams
              properties:
                webhookUrl: MY_WEBHOOK_URL
# {stop-highlight}
```

**Email:**

```yml
resources:
  myResource:
    type: ...
    properties:
# ...
      alarms:
        - trigger:
# ...
# {start-highlight}
          notificationTargets:
            - type: email
              properties:
                sender: alarm@company.com
                recipient: support@company.com
# {stop-highlight}
```

### Evaluation

The evaluation section configures the evaluation period for the monitored metric.

```yml
resources:
  myResource:
    type: ...
    properties:
# ...
      alarms:
        - trigger:
# ...
# {start-highlight}
          evaluation:
            period: 200
# {stop-highlight}
```

## Trigger a Lambda function on alarm

You can trigger a Lambda function when an alarm is fired. For more information, see the [alarm event documentation](../../compute-resources/functions//index.md).

## Trigger types

### Lambda Error Rate

### Lambda Duration

### Database Read Latency

### Database Write Latency

### Database CPU Utilization

### Database Free Storage

### Database Free Memory

### Database Connection Count

### Http Api Gateway Error Rate

### Http Api Gateway Latency

### Application Load Balancer Error Rate

### Application Load Balancer Custom

### Sqs Queue Received Messages

### Sqs Queue Not Empty