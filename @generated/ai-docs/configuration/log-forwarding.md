# Log Forwarding

Log forwarding is the process of sending log data from your applications and services to a centralized location or a third-party log management provider. While _CloudWatch_ is the primary log management service in AWS, many users choose to forward logs to third-party providers for advanced features like real-time analysis, machine learning insights, and customizable dashboards, or to meet specific compliance requirements.

Stacktape makes it easy to forward logs to the endpoint of your choice.

## HTTP endpoint forwarding

You can forward logs to any HTTP endpoint that complies with the [Firehose request and response specifications](https://docs.aws.amazon.com/firehose/latest/dev/httpdeliveryrequestresponse.html). Many third-party vendors are compliant with these specifications out of the box.

```yaml
resources:
  myFunction:
    type: function
    properties:
      # {start-highlight}
      logging:
        logForwarding:
          type: http-endpoint
          properties:
            endpointUrl: https://my-endpoint.com
      # {stop-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/js-lambda.js
```

## Datadog forwarding

Forwards logs to your Datadog account.

```yaml
resources:
  myFunction:
    type: function
    properties:
      # {start-highlight}
      logging:
        logForwarding:
          type: datadog
          properties:
            apiKey: your_datadog_api_key
      # {stop-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/js-lambda.js
```

## Highlight forwarding

Forwards logs to your Highlight project.

```yaml
resources:
  myFunction:
    type: function
    properties:
      # {start-highlight}
      logging:
        logForwarding:
          type: highlight
          properties:
            projectId: your_highlight_project_id
      # {stop-highlight}
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: lambdas/js-lambda.js
```