# Access policy statements

For fine-grained control, you can define custom access policy statements. This requires knowledge of [AWS IAM](https://aws.amazon.com/iam/). For examples, see the [AWS documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies.html).

```yaml
resources:
  myBucket:
    type: bucket
    properties:
      # {start-highlight}
      accessibility:
        accessibilityMode: private
        accessPolicyStatements:
          - Resource:
              - $ResourceParam('myBucket', 'arn')
            Action:
              - 's3:ListBucket'
            Principal: '*'
      # {stop-highlight}
```