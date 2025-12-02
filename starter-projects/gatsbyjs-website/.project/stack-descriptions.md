### 1.1 Bucket

Hosting bucket contains the built Gatsby website:

- The built website is automatically uploaded into the bucket as a part of the deployment process.
- [CDN](https://docs.stacktape.com/resources/cdns/) is automatically configured in front of the bucket to deliver your
  website across the world with minimal latency.
- To ensure that the CDN always serves the newest version of the website, CDN cache is automatically invalidated
  (flushed) after each deployment.

```yml
resources:
  webBucket:
    type: hosting-bucket
    properties:
      uploadDirectoryPath: ./dist
      hostingContentType: gatsby-static-website
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
  build:
    # or "yarn build"
    executeCommand: npm run build

hooks:
  beforeDeploy:
    # build project before deploy
    - executeNamedScript: build
```

Scripts specified in [scripts](https://docs.stacktape.com/configuration/scripts/) section of config, can be run manually
anytime using `stp script:run` [command](https://docs.stacktape.com/cli/commands/script-run/).
