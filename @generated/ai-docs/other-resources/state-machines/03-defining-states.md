# Defining states

You define state machines using the [Amazon States Language](https://docs.aws.amazon.com/step-functions/latest/dg/concepts-amazon-states-language.html). This example shows a simple order payment flow composed of Lambda functions:

```yaml
resources:
  checkAndHoldProduct:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'check-and-hold-product.ts'

  billCustomer:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'bill-customer.ts'

  shipmentNotification:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'shipment-notification.ts'

  eshopBuyingProcessStateMachine:
    type: 'state-machine'
    properties:
      # {start-highlight}
      definition:
        StartAt: 'checkAndHold'
        States:
          checkAndHold:
            Type: Task
            Resource: $ResourceParam('checkAndHoldProduct', 'arn')
            Next: bill
          bill:
            Type: Task
            Resource: $ResourceParam('billCustomer', 'arn')
            Next: notify
          notify:
            Type: Task
            Resource: $ResourceParam('shipmentNotification', 'arn')
            Next: succeed
          succeed:
            Type: Succeed
      # {stop-highlight}
```