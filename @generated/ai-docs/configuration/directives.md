# Directives

Directives are functions that add dynamic behavior to your `stacktape.yml` file. They allow you to go beyond the
declarative nature of YAML and introduce logic into your configurations.

Stacktape supports two types of directives:

- **Built-in directives** are provided by Stacktape for common tasks, such as accessing command-line arguments or
  formatting strings.
- **Custom directives** are user-defined functions that allow you to add your own logic, such as setting a database
  instance size based on the deployment stage or fetching data required for your configuration. Custom directives can be
  written in Javascript, Typescript, or Python.

## How to use directives

Directives always start with a `$` and can be used to configure any property in your `stacktape.yml` file.

```yaml
myProperty: $MyDirective()
```

A directive can return primitive values (strings, numbers, booleans), objects, or arrays. You can access properties of a
returned object using dot notation (e.g., `$Directive().propertyName`).

Directives can accept any number of arguments. If you pass arguments inline, they must be primitive values. If you pass
arguments as the result of another directive, they can be primitive values, objects, or arrays.

```yaml
myProperty: $MyDirective('myParameter', 3, true)
```

Directives can be nested up to two levels deep (e.g., `$MyDirective1($MyDirective2())`). To overcome this limitation,
you can use [variables](#var) to store the output of a directive and then reference it in another.

```yaml
myProperty: $MyDirective1($MyDirective2())
```

## Built-in directives

Built-in directives are resolved either **locally** (when the configuration is loaded) or at **runtime** (during
deployment).

### Local directives

Local directives are resolved when the configuration is loaded, and their values are substituted directly into the
configuration.

#### $CliArgs()

Returns a command-line argument passed to a Stacktape command. You can pass custom arguments to a Stacktape command
after the `--` separator. You can also specify a default value as the second argument to the directive (e.g.,
`$CliArgs('myArg', 'myDefaultValue')`).

```bash
stacktape deploy --stage test --region eu-west-1 -- --myCustomArg myValue
```

```yaml
scripts:
  build:
    type: local-script
    properties:
      # {start-highlight}
      executeCommand: $Format('npm run build --stage {}', $CliArgs('stage'))
      # {stop-highlight}

resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: src/main.ts

      environment:
        - name: STAGE
          # {start-highlight}
          value: $CliArgs('stage')
          # {stop-highlight}
        - name: CUSTOM_ARG
          # {start-highlight}
          value: $CliArgs('myCustomArg', 'myDefaultValue')
          # {stop-highlight}
      resources:
        cpu: 2
        memory: 2048
```

#### $File()

Reads and parses the content of a file. Supported file types are `.env`, `.ini`, `.json`, and `.yml`.

##### Dotenv files

Parses the contents of a `.env` file.

```env
myvar1=value1
```

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      environment:
        - name: MY_DIRECTIVE_VARIABLE
          # {start-highlight}
          value: $File('.env.staging').myvar1
          # {stop-highlight}
```

##### INI files

Parses the contents of an `.ini` file.

```ini
myvar1=value1
```

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      environment:
        - name: MY_DIRECTIVE_VARIABLE
          # {start-highlight}
          value: $File('file.ini').myvar1
          # {stop-highlight}
```

##### JSON files

Parses the contents of a `.json` file.

```json
{ "myvar1": "value1" }
```

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      environment:
        - name: MY_DIRECTIVE_VARIABLE
          # {start-highlight}
          value: $File('file.json').myvar1
          # {stop-highlight}
```

##### YML files

Parses the contents of a `.yml` file.

```yaml
myvar1: value1
```

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      environment:
        - name: MY_DIRECTIVE_VARIABLE
          # {start-highlight}
          value: $File('file.yml').myvar1
          # {stop-highlight}
```

#### $FileRaw()

Loads the content of a file and returns it as a string (UTF-8 encoded).

```yaml
resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my-lambda.ts
      environment:
        - name: MY_KEY
          # {start-highlight}
          value: $FileRaw('my-key.txt')
          # {stop-highlight}
```

#### $Format()

Returns an interpolated string. The first argument is the string to be interpolated, and subsequent arguments are the
values to be substituted for each `{}` placeholder. The number of placeholders must match the number of subsequent
arguments.

The `$Format()` directive cannot contain runtime-resolved directives as arguments. For those use cases, use the
[`$CfFormat()`](#cfformat) directive.

- `$Format('{}-{}', 'foo', 'bar')` results in `foo-bar`.
- `$Format('{}-mydomain.com', 'foo')` results in `foo-mydomain.com`.
- `$Format('{}.{}', $Stage(), 'mydomain.com')` results in `staging.mydomain.com` if the stage is `staging`.

#### $Var()

Returns a variable defined in the `variables` section of your `stacktape.yml` file. Variables are useful for:

- Reusing values throughout your template.
- Organizing your template files.
- Storing intermediate return values of other directives to allow for multi-level nesting.

```yaml
# {start-highlight}
variables:
  eventName: myCustomEventName
# {stop-highlight}

resources:
  myEventBus:
    type: 'event-bus'
  # publishes events with EventName set to $Var().eventName into myEventBus
  myPublisherFunction:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/event-bus-publisher.ts'
      environment:
        - name: EVENT_NAME
          # {start-highlight}
          value: $Var().eventName
          # {stop-highlight}
      connectTo:
        - myEventBus
  # listens for events with EventName set to $Var().eventName published into myEventBus
  myConsumerFunction:
    type: 'function'
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'lambdas/consumer.ts'
      events:
        - type: event-bus
          properties:
            eventBusName: myEventBus
            eventPattern:
              detail:
                EventName:
                  # {start-highlight}
                  - $Var().eventName
                  # {stop-highlight}
```

#### $Stage()

Returns the current `stage`. Unlike `$CliArgs().stage`, this directive also resolves default values configured with the
`stacktape defaults:configure` command.

#### $Region()

Returns the current `region`. Unlike `$CliArgs().region`, this directive also resolves default values configured with
the `stacktape defaults:configure` command.

#### $Profile()

Returns the current `profile`. Unlike `$CliArgs().profile`, this directive also resolves default values configured with
the `stacktape defaults:configure` command.

#### $This()

Returns the current Stacktape template as an object.

```yaml
# {start-highlight}
# {stop-highlight}

resources:
  myHttpApi:
    type: 'http-api-gateway'
    properties:
      customDomains:
        # {start-highlight}
        # we are interpolating serviceName using This directive
        - domainName: $Format('{}-{}', $This().serviceName, 'mydomain.com')
        # {stop-highlight}
```

#### $GitInfo()

Returns information about the current Git repository and user.

| Directive usage        | Description                            |
| ---------------------- | -------------------------------------- |
| `$GitInfo('commit')`   | Return the latest commit ID            |
| `$GitInfo('branch')`   | Returns the name of the current branch |
| `$GitInfo('username')` | Returns git user's name                |
| `$GitInfo('gitUrl')`   | Returns the URL of the git repository  |

```yaml
resources:
  myLambda:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: 'path/to/my-lambda.ts'
      environment:
        - name: COMMIT
          # {start-highlight}
          value: $GitInfo('commit')
          # {stop-highlight}
```

#### $StackOutput()

Returns the specified output of another stack, allowing you to reference resources deployed in a different stack.

The arguments are:

- **stack name**: The name of the stack that contains the output. If the stack was deployed with Stacktape, the name has
  the format `<<projectName>>-<<stage>>`.
- **output name**: The name of the output to return.

Consider a stack named `base-stack` deployed to a `dev` stage with the following configuration:

```yaml
stackConfig:
  # {start-highlight}
  outputs:
    - name: bucketName
      value: $ResourceParam('baseBucket', 'arn')
  # {stop-highlight}

resources:
  baseBucket:
    type: bucket
```

You can reference the output of `base-stack` in another stack:

```yml
variables:
  baseStackName: $Format('{}-{}', 'base-stack', $Stage())

scripts:
  validateBucket:
    executeScript: hooks/validate-bucket-in-base-stack.ts
    environment:
      - name: BUCKET_NAME
        # {start-highlight}
        value: $StackOutput($Var().baseStackName, 'baseBucketName')
        # {stop-highlight}

hooks:
  beforeDeploy:
    # {start-highlight}
    - executeNamedScript: validateBucket
    # {stop-highlight}

resources: ...
```

### Runtime directives

Some directives are resolved at runtime by _Cloudformation_ during deployment. This is necessary when the value of a
directive is not known until a resource is created. For example, the connection string of a database is only available
after the database has been deployed.

Under the hood, runtime directives are transformed into
[CloudFormation intrinsic functions](https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference.html).

#### $ResourceParam()

Returns a specified parameter of a Stacktape resource, such as the name or port of a database, or the URL of an HTTP API
Gateway.

The arguments are:

- **stacktape resource name**: The name of the Stacktape resource as defined in your configuration.
- **parameter name**: The parameter to reference. You can find a list of all referenceable parameters in the
  documentation for each resource:
  - [relational-databases](../../database-resources/relational-databases//index.md)
  - [dynamo-db-tables](../../database-resources/dynamo-db-tables//index.md)
  - [mongo-db-atlas-clusters](../../3rd-party-resources/mongo-db-atlas-clusters//index.md)
  - [redis-clusters](../../database-resources/redis-clusters//index.md)
  - [http-api-gateways](../../other-resources/http-api-gateways//index.md)
  - [buckets](../../other-resources/buckets//index.md)
  - [application-load-balancers](../../other-resources/application-load-balancers//index.md)
  - [event-buses](../../other-resources/event-buses//index.md)
  - [functions](../../compute-resources/functions//index.md)
  - [multi-container-workloads](../../compute-resources/multi-container-workloads//index.md)
  - [batch-jobs](../../compute-resources/batch-jobs//index.md)

For more information, see [Referencing parameters](../../configuration/referencing-parameters.md).

```yml
resources:
  myDatabase:
    type: relational-database
    properties: ...

  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      environment:
        # {start-highlight}
        - name: DB_CONNECTION_STRING
          value: $ResourceParam('myDatabase', 'connectionString')
        # {stop-highlight}
```

#### $CfResourceParam()

Returns a specified parameter of a _Cloudformation_ resource.

The arguments are:

- **cloudformation logical name**: The logical name of the _Cloudformation_ resource. If you are referencing a resource
  defined in the `cloudformationResources` section, use its name. To reference a child resource of a Stacktape resource,
  you can get a list of child resources with the `stacktape stack-info` command.
- **parameter name**: The parameter of the _Cloudformation_ resource to reference. For a list of all referenceable
  parameters, see
  [Referencing parameters](../../configuration/referencing-parameters.md).

For more information, see [Referencing parameters](../../configuration/referencing-parameters.md).

```yml
cloudformationResources:
  MySnsTopic:
    Type: AWS::SNS::Topic

resources:
  myBucket:
    type: bucket

  processData:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      destinations:
        # {start-highlight}
        onFailure: $CfResourceParam('MySnsTopic', 'Arn')
        # {stop-highlight}
      environment:
        - name: BUCKET_NAME
          # {start-highlight}
          value: $CfResourceParam('MyBucketBucket', 'Name')
        # {stop-highlight}
```

#### $Secret()

Returns the value of a secret. For more information, see the [secrets documentation](../../security-resources/secrets/index.md).

The argument is the name of the secret. If the secret is in JSON format, you can extract nested properties using dot
notation.

```yml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        # {start-highlight}
        masterUserPassword: $Secret('my-database-password')
        # {stop-highlight}
```

Alternatively:

```yml
resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        # {start-highlight}
        masterUserPassword: $Secret('my-database-credentials.password')
        # {stop-highlight}
```

#### $CfFormat()

Returns an interpolated string. Unlike the [`$Format()`](#format) directive, the `$CfFormat()` directive can contain
runtime-resolved directives as arguments.

The arguments are:

- **string to interpolate**: Occurrences of `{}` are replaced by the subsequent arguments.
- **values to use in the interpolation**: The number of values must be equal to the number of `{}` placeholders in the
  first argument.

- `$CfFormat('{}-{}', 'foo', 'bar')` results in `foo-bar`.
- `$CfFormat('{}-mydomain.com', 'foo')` results in `foo-mydomain.com`.
- `$CfFormat('{}.mydomain.com', $Stage())` results in `staging.mydomain.com` if the stage is `staging`.

#### $CfStackOutput()

Returns the output of another stack, allowing you to reference resources deployed in another stack. The referenced stack
must already be deployed. If you try to delete a stack that is referenced by another stack, you will get an error.

To get the output locally (i.e., download the value and pass it to the configuration), use the
[`$StackOutput()`](#stackoutput) directive.

The arguments are:

- **stack name**: The name of the stack that contains the output. If the stack was deployed using Stacktape, the name
  has the format `<<projectName>>-<<stage>>`.
- **output name**: The name of the output to reference.

Consider a stack named `base-stack` deployed to a `dev` stage with the following configuration:

```yaml
stackConfig:
  # {start-highlight}
  outputs:
    - name: bucketName
      value: $ResourceParam('baseBucket', 'arn')
  # {stop-highlight}

resources:
  baseBucket:
    type: bucket
```

You can reference the output of `base-stack` in another stack:

```yml
variables:
  baseStackName: $Format('{}-{}', 'base-stack', $Stage())

resources:
  myFunction:
    type: function
    properties:
      packaging:
        type: stacktape-lambda-buildpack
        properties:
          entryfilePath: path/to/my/lambda.ts
      environment:
        - name: OTHER_STACK_BUCKET_NAME
          # {start-highlight}
          value: $CfStackOutput($Var().baseStackName, 'bucketName')
          # {stop-highlight}
```

## Custom directives

Custom directives are user-defined functions that allow you to add your own logic to your configurations, such as
setting a database instance size based on the deployment stage or fetching data required for your configuration.

### Registering directives

To use a custom directive, you must first register it in the `directives` section of your `stacktape.yml` file.

```yaml
directives:
  - name: myDirective
    filePath: path/to/my/directive.ts:functionName
```

### Writing directives

You can write custom directives in Javascript, Typescript, or Python. They can return primitive values, objects, or
arrays. If a directive returns an object, you can access its properties using dot notation (e.g.,
`$GetBooks().books.Dune`).

Any code outside the function handler will be executed only once, when the configuration is first parsed.

#### Javascript and Typescript

You can write directives in Javascript (ES2020) and Typescript. The code is automatically transpiled. Your directive can
return a promise, which will be automatically awaited.

```ts
export const getDbInstanceSize = (stage: string) => {
  if (stage === "production") {
    return "db.m5.xlarge";
  }
  return "db.t2.micro";
};
```

```yaml
# {start-highlight}
directives:
  - name: getDbInstanceSize
    filePath: my-directive.ts:getDbInstanceSize
# {stop-highlight}

resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            # {start-highlight}
            instanceSize: $getDbInstanceSize($Stage())
          # {stop-highlight}
```

#### Python

```python
def get_db_instance_size(stage):
    if (stage == 'production'):
        return 'M5'
    return 'M2'
```

```yaml
# {start-highlight}
directives:
  - name: get_db_instance_size
    filePath: my-directive.py:get_db_instance_size
# {stop-highlight}

resources:
  myDatabase:
    type: relational-database
    properties:
      credentials:
        masterUserPassword: $Secret('database.password')
      engine:
        type: postgres
        properties:
          version: '16.2'
          port: 5432
          primaryInstance:
            # {start-highlight}
            instanceSize: $get_db_instance_size($Stage())
          # {stop-highlight}
```