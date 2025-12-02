# Configuring a Stack

A Stacktape configuration file is a blueprint for your application. It tells Stacktape what to build, what _infrastructure resources_ to create, and how to connect everything.

You can write your configuration in YAML, JSON, or TypeScript.

## 1. Defining Resources

The `resources` section is where you define the components of your application. Each resource must have a unique name.

Here's an example of a `web-service` resource:

```yaml
resources:
  myWebService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./src/server.ts
      resources:
        cpu: 0.5
        memory: 2048
```

This configuration defines a web service named `myWebService` that runs a Node.js application.

## 2. Packaging Your Application

For resources that run your code (like services and functions), you need to tell Stacktape how to package it.

### Packaging Containers

#### From Source Code (Buildpacks)

Stacktape can automatically build a container image from your source code using **buildpacks**. This is the easiest way to package your application. Stacktape has its own optimized buildpacks for popular languages, and also supports external buildpacks like [Paketo](https://paketo.io/) and [Heroku](https://devcenter.heroku.com/articles/buildpacks#officially-supported-buildpacks).

```yaml
packaging:
  type: stacktape-image-buildpack
  properties:
    entryfilePath: ./src/server.ts
```

#### Using a Dockerfile

If you have an existing `Dockerfile`, you can use it to build your container image.

```yaml
packaging:
  type: custom-dockerfile
  properties:
    buildContextPath: ./
    dockerfilePath: ./Dockerfile
```

#### Using a Pre-built Image

If you have already built a container image and pushed it to a registry, you can use it directly.

```yaml
packaging:
  type: prebuilt-image
  properties:
    image: my-registry/my-repo:my-tag
```

### Packaging Lambda Functions

#### From Source Code

Stacktape can automatically package your _Lambda functions_ from source code, including all their dependencies.

```yaml
packaging:
  type: stacktape-lambda-buildpack
  properties:
    entryfilePath: ./src/my-lambda.ts
```

#### Using a Custom Artifact

If you prefer to build your _Lambda function_ artifacts yourself, you can point Stacktape to the resulting zip file.

```yaml
packaging:
  type: custom-artifact
  properties:
    packagePath: ./my-artifact.zip
```

## 3. Connecting Resources

You can connect resources to each other using the `connectTo` property. This automatically:

-   Injects the necessary environment variables into the source resource.
-   Grants the required _IAM_ permissions and _security group_ rules for the resources to communicate.

For example, to connect a `web-service` to a `relational-database`:

```yaml
resources:
  myWebService:
    type: web-service
    properties:
      # ... packaging and other properties
      # {start-highlight}
      connectTo:
        - myDatabase
      # {stop-highlight}
  myDatabase:
    type: relational-database
    properties:
      # ... database properties
```

This will inject environment variables like `STP_MY_DATABASE_CONNECTION_STRING` into the `myWebService` container.

## 4. Scripts and Hooks

Stacktape allows you to run custom scripts and commands during the deployment lifecycle.

-   **Scripts** are reusable commands that can be run manually or automatically.
-   **Hooks** are scripts that run automatically before or after a deployment.

For example, you can use a hook to run database migrations after each deployment:

```yaml
scripts:
  migrateDb:
    type: local-script
    properties:
      executeCommand: npx prisma db push
      connectTo:
        - myDatabase

hooks:
  afterDeploy:
    - scriptName: migrateDb
```

## 5. Extending with CloudFormation

You can extend your Stacktape configuration with any _CloudFormation_ resource using the `cloudformationResources` section. This gives you access to the full power of AWS.

You can reference outputs from your _CloudFormation_ resources in your Stacktape resources.

```yaml
resources:
  myLambda:
    type: function
    properties:
      # ...
      environment:
        MY_MONITOR_ARN: $CfResourceParam('MyAnomalyMonitor', 'MonitorArn')

cloudformationResources:
  MyAnomalyMonitor:
    Type: "AWS::CE::AnomalyMonitor"
    Properties:
      MonitorName: "MyMonitor"
      MonitorType: "DIMENSIONAL"
      MonitorDimension: "SERVICE"
```

## 6. Overriding Properties

Stacktape abstracts away the complexity of _CloudFormation_, but you can still override the properties of the underlying _CloudFormation_ resources if you need to.

```yaml
resources:
  myFunction:
    type: function
    properties:
      # ...
    overrides:
      MyFunctionFunction: # This is the logical ID of the underlying CloudFormation resource
        Description: "My overridden lambda function description"
```

## 7. Dynamic Configurations

You can add dynamic behavior to your configurations in two ways:

### Using Directives

Directives are functions that you can use in your YAML configuration to generate values dynamically.

For example, you can use the built-in `$Stage()` directive to create a different domain name for each _stage_:

```yaml
properties:
  customDomains:
    - domainName: $Format('{}-api.mydomain.com', $Stage())
```

### Using TypeScript or JavaScript

For more complex logic, you can write your configuration in TypeScript or JavaScript. This gives you the full power of a programming language to construct your configuration.

```typescript
import type { GetConfigFunction } from '@stacktape/sdk';

export const getConfig: GetConfigFunction = ({ stage }) => {
  return {
    resources: {
      myWebService: {
        type: "web-service",
        properties: {
          resources: {
            cpu: stage === 'production' ? 2 : 0.5,
            memory: stage === 'production' ? 4096 : 512
          },
          // ...
        },
      },
    },
  };
};
```