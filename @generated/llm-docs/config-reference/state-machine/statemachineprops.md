# StateMachineProps API Reference

Resource type: `state-machine`

## TypeScript definition

```typescript
import type { StateMachineDefinition } from 'stacktape';

type StateMachineProps = {
  /** The workflow definition in Amazon States Language (ASL). */
  definition: StateMachineDefinition;
};
```

## Property: `definition`

- Required: yes
- Type: `StateMachineDefinition`

The workflow definition in [Amazon States Language (ASL)](https://states-language.net/spec.html).

### Example 1 (yaml)

```yaml
resources:
  chargeCard:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: ./src/charge-card.ts

  paymentWorkflow:
    type: state-machine
    properties:
      definition:
        Comment: Charge the customer's card
        StartAt: ChargeCard
        States:
          ChargeCard:
            Type: Task
            Resource:
              Fn::GetAtt:
                - ChargeCardFunction
                - Arn
            End: true
```

### Example 2 (typescript)

```typescript
import { LambdaFunction, StacktapeLambdaBuildpackPackaging, StateMachine, defineConfig } from 'stacktape';

export default defineConfig(() => {
  const chargeCard = new LambdaFunction({
    packaging: new StacktapeLambdaBuildpackPackaging({ entryfilePath: './src/charge-card.ts' })
  });
  const paymentWorkflow = new StateMachine({
    definition: {
      Comment: "Charge the customer's card",
      StartAt: 'ChargeCard',
      States: {
        ChargeCard: {
          Type: 'Task',
          Resource: { 'Fn::GetAtt': ['ChargeCardFunction', 'Arn'] },
          End: true
        }
      }
    }
  });
  return { resources: { chargeCard, paymentWorkflow } };
});
```
