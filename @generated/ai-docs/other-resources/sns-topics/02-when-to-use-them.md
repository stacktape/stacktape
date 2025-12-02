# When to use them

Stacktape offers three managed resources for messaging and communication:

1.  SNS topics
2.  [SQS queues](../../other-resources/sqs-queues//index.md)
3.  [Event buses](../../other-resources/event-buses//index.md)

**Use an SNS topic when:**

-   You need to publish messages to many different subscribers with a single action.
-   You require high throughput and reliability.

**Use an SQS queue when:**

-   You need reliable, one-to-one, asynchronous communication to decouple your applications.
-   You want to control the rate at which messages are consumed.

**Use an event bus when:**

-   You want to publish messages to many subscribers and use the event data itself to filter which messages are delivered to which subscribers.
-   You need to integrate with third-party SaaS providers like Shopify, Datadog, or PagerDuty.