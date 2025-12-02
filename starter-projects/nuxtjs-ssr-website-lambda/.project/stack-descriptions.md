### 1.1 HTTP API Gateway

API Gateway receives requests and routes them to the container.

For convenience, it has [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) allowed.

```yml
resources:
  mainApiGateway:
    type: http-api-gateway
    properties:
      cors:
        enabled: true
```

### 1.2 Bucket

The bucket is used to store our static assets. By putting CDN in front of the bucket, its content can be distributed
across the globe and served with minimal latencies.

New/modified static assets are automatically uploaded during deployment process.

We are also enabling cors on our bucket, to allow clients(browsers) access to the resources.

```yml
webBucket:
  type: bucket
  properties:
    cors:
      enabled: true
    directoryUpload:
      directoryPath: ./.output/public
      headersPreset: static-website
    cdn:
      enabled: true
      invalidateAfterDeploy: true
```

### 1.3 Function

Application is run in a lambda function.

The function is configured as follows:

- **Packaging** - determines how the lambda artifact is built. The easiest and most optimized way to build the lambda
  from Typescript/Javascript is using `stacktape-lambda-buildpack`. We only need to configure `entryfilePath`. Stacktape
  automatically transpiles and builds the application code with all of its dependencies, creates the lambda zip
  artifact, and uploads it to a pre-created S3 bucket on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-lambda-functions).
- **Environment variables** - We are passing URL of the **static assets CDN** to the function as an environment
  variable. URL can be easily referenced using a
  [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
  accepts a resource name (`webBucket` in this case) and the name of the
  [bucket referenceable parameter](https://docs.stacktape.com/resources/buckets/#referenceable-parameters) (`cdnUrl` in
  this case). If you want to learn more, refer to
  [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
  [directives](https://docs.stacktape.com/configuration/directives) guide.
- **Events** - Events determine how is function triggered. In this case, we are triggering the function when an event
  (HTTP request) is delivered to the HTTP API gateway. By configuring the path to `/{proxy+}` and the method to `'*'`,
  the event integration routes all requests (no matter the method or path) coming to the HTTP API Gateway to the
  function.

```yml
nuxtLambda:
  type: function
  properties:
    packaging:
      type: stacktape-lambda-buildpack
      properties:
        entryfilePath: ./handler.ts
    environment:
      - name: NUXT_APP_CDN_URL
        value: $ResourceParam('webBucket', 'cdnUrl')
    events:
      - type: http-api-gateway
        properties:
          httpApiGatewayName: mainApiGateway
          method: "*"
          path: /{proxy+}
```

## 2. Application build hook

To automatically build the application before each deployment, the stacktape configuration contains a
[hook](https://docs.stacktape.com/configuration/hooks/).

[Hooks](https://docs.stacktape.com/configuration/hooks/) specify the commands or scripts which are executed
automatically before or after command is executed (i.e every time before the stack is deployed). You can specify
reusable script in [scripts](https://docs.stacktape.com/configuration/scripts/) section of config and reference it
inside a hook or inline script/command information directly.

```yml
scripts:
  nuxtBuild:
    executeCommand: npm run build

hooks:
  beforeDeploy:
    - executeNamedScript: nuxtBuild
```

Scripts specified in [scripts](https://docs.stacktape.com/configuration/scripts/) section of config, can be run manually
anytime using `stp script:run` [command](https://docs.stacktape.com/cli/commands/script-run/).
