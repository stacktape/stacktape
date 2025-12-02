### 1.1 Web Service

Application runs in web-service resource and is configured as follows:

- **Packaging** - determines how the Docker container image is built. The easiest and most optimized way to build the
  image for a Typescript application is using `stacktape-image-buildpack`. We only need to configure `entryfilePath`.
  Stacktape automatically transpiles and builds the application code with all of its dependencies, builds the Docker
  image, and pushes it to a pre-created image repository on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-web-services).
- **Environment variables** - We are passing URL of the **static assets CDN** to the container as an environment
  variable. URL can be easily referenced using a
  [$ResourceParam() directive](https://docs.stacktape.com/configuration/directives/#resource-param). This directive
  accepts a resource name (`webBucket` in this case) and the name of the
  [bucket referenceable parameter](https://docs.stacktape.com/resources/buckets/#referenceable-parameters) (`cdnUrl` in
  this case). If you want to learn more, refer to
  [referencing parameters](https://docs.stacktape.com/configuration/referencing-parameters/) guide and
  [directives](https://docs.stacktape.com/configuration/directives) guide.
- [Resources](https://docs.stacktape.com/compute-resources/web-services#resources). The cheapest available resource
  configuration is `0.25` of virtual CPU and `512` MB of RAM.
- For convenience, automatic CORS is enabled.

You can also configure [scaling](https://docs.stacktape.com/compute-resources/web-services#scaling). New (parallel)
container can be added when (for example) the utilization of your CPU or RAM gets larger than 80%. The traffic is evenly
distributed to all the containers.

```yml
resources:
  webService:
    type: web-service
    properties:
      packaging:
        type: stacktape-image-buildpack
        properties:
          entryfilePath: ./server.ts
      environment:
        - name: NUXT_APP_CDN_URL
          value: $ResourceParam('webBucket', 'cdnUrl')
      resources:
        cpu: 0.25
        memory: 512
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
