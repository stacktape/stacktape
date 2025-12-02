# Overview

Deployment scripts allow you to execute custom logic as part of your deployment process. You can pass information about your infrastructure to the script and grant it permissions to interact with other resources in your stack.

Under the hood, a deployment script is packaged as an [AWS Lambda function](https://aws.amazon.com/lambda/) and triggered during the `deployment` or `delete` process. Deployment scripts are not executed during hot-swap deployments.