# SubIntrinsic API Reference

## TypeScript definition

```typescript
import type { AndIntrinsic, Base64Intrinsic, JoinIntrinsic, SelectIntrinsic } from 'stacktape';

type SubIntrinsic = {
  "Fn::Sub": SubIntrinsicFnSub;
};

/** Union choices used by the properties above. */
type SubIntrinsicFnSub =
  | "option-1"
  | "option-2"
  | AndIntrinsic
  | "option-4"
  | "option-5"
  | "option-6"
  | Base64Intrinsic
  | "option-8"
  | "option-9"
  | "option-10"
  | "option-11"
  | JoinIntrinsic
  | SelectIntrinsic
  | "option-14"
  | SubIntrinsic
  | "option-16"
  | "option-17"
  | "option-18";
```

## Property: `Fn::Sub`

- Required: yes
- Type: `option-1 | option-2 | AndIntrinsic | option-4 | option-5 | option-6 | Base64Intrinsic | option-8 | option-9 | option-10 | option-11 | JoinIntrinsic | SelectIntrinsic | option-14 | SubIntrinsic | option-16 | option-17 | option-18`

Choices:
- `option-1`. Properties: `Ref: string`.
- `option-2`. Properties: `Condition: string`.
- `AndIntrinsic` (`AndIntrinsic`). Properties: `Fn::And: Array<option-1 | AndIntrinsic | option-3 | option-4 | option-5>`.
- `option-4`. Properties: `Fn::Equals: Array<unknown>`.
- `option-5`. Properties: `Fn::Not: Array<unknown>`.
- `option-6`. Properties: `Fn::Or: Array<option-1 | AndIntrinsic | option-3 | option-4 | option-5>`.
- `Base64Intrinsic` (`Base64Intrinsic`). Properties: `Fn::Base64: unknown`.
- `option-8`. Properties: `Fn::FindInMap: Array<unknown>`.
- `option-9`. Properties: `Fn::GetAtt: Array<unknown>`.
- `option-10`. Properties: `Fn::GetAZs: unknown`.
- `option-11`. Properties: `Fn::ImportValue: unknown`.
- `JoinIntrinsic` (`JoinIntrinsic`). Properties: `Fn::Join: Array<unknown>`.
- `SelectIntrinsic` (`SelectIntrinsic`). Properties: `Fn::Select: Array<unknown>`.
- `option-14`. Properties: `Fn::Split: Array<unknown>`.
- `SubIntrinsic` (`SubIntrinsic`). Properties: `Fn::Sub: option-1 | option-2 | AndIntrinsic | option-4 | option-5 | option-6 | Base64Intrinsic | option-8 | option-9 | option-10 | option-11 | JoinIntrinsic | SelectIntrinsic | option-14 | SubIntrinsic | option-16 | option-17 | option-18`.
- `option-16`. Properties: `Fn::If: Array<unknown>`.
- `option-17`
- `option-18`
