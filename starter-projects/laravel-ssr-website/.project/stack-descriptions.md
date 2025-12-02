### 1.1 Web Service

Application runs in web-service resource and is configured as follows:

- **Packaging** - determines how the Docker container image is built. In this case, we are using `external-buildpack`.
  We are configuring `sourceDirectoryPath`(in our case it is the root of our project) as well as specifying custom
  heroku builder. The builder scans the directory and automatically chooses buildpack to build the image. Built image is
  then pushed to a pre-created image repository on AWS. You can also use
  [other types of packaging](https://docs.stacktape.com/configuration/packaging/#packaging-web-services).

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
                type: external-buildpack
                properties:
                    sourceDirectoryPath: ./
                    builder: public.ecr.aws/heroku/builder:24
                    buildpacks:
                        - heroku/php
            resources:
                cpu: 0.25
                memory: 512
            environment:
                # Recommended way to store secrets is to use https://docs.stacktape.com/resources/secrets/
                - name: APP_KEY
                  value: base64:mKaPSaWP+f/tbA6sH/FMlvzy8NzaR6nfhW1h08btVHo=
            cors:
                enabled: true
```
