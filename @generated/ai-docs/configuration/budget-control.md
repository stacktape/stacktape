# Budget Control

Budget control helps you monitor your spending and sends email notifications when predefined limits are exceeded.

To use budget control, you must first [enable Stacktape cost allocation tags](../../user-guides/enabling-budgeting/.md).

## How to use budget control

```yml
# {start-highlight}
budgetControl:
  limit: 100 # USD
# {stop-highlight}
```

## Notifications

You can configure notifications to be sent when your actual or forecasted spending exceeds a certain threshold.

### Actual budget notifications

If you set `budgetType` to `ACTUAL` (or omit it), a notification is triggered when your actual spending exceeds the
budget limit.

```yml
# {start-highlight}
budgetControl:
  limit: 100 # USD
  notifications:
    - emails:
        - mail1@example.com
        - mail2@example.com
# {stop-highlight}
```

### Forecasted budget notifications

If you set `budgetType` to `FORECASTED`, a notification is triggered when your forecasted spending exceeds the budget
limit.

```yml
# {start-highlight}
budgetControl:
  limit: 100
  notifications:
    - budgetType: FORECASTED
      thresholdPercentage: 80
      emails:
        - mail1@example.com
# {stop-highlight}
```