# Overrides

Stacktape uses _Cloudformation_ to deploy your infrastructure to AWS. Each Stacktape resource you define in the `resources` section of your `stacktape.yml` file is translated into one or more underlying _Cloudformation_ resources. Overrides allow you to modify the properties of these generated _Cloudformation_ resources.

## How to use overrides

Imagine you want to override the timeout of an AWS Lambda function that is part of the `myFunction` Stacktape resource in the following configuration:

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
```

In the interactive config editor, you can inspect the translated _Cloudformation_ template for this configuration. You will see that the `myFunction` resource contains two _Cloudformation_ resources: `MyFunctionFunction` (of type `AWS::Lambda::Function`) and `MyFunctionLogGroup` (of type `AWS::Logs::LogGroup`).

To override the timeout, you would add an override for the `MyFunctionFunction` resource:

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
    # {start-highlight}
    overrides:
      MyFunctionFunction:
        Timeout: 15
    # {stop-highlight}
```