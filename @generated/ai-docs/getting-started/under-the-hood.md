# Under the Hood

This guide explains what happens behind the scenes when you deploy a Stacktape application.

## The Deployment Process

A Stacktape deployment consists of five phases:

1.  **Resolve & Validate Configuration:** Stacktape compiles your `stacktape.yml` file into a _CloudFormation_ template. This template is a detailed blueprint of all the _infrastructure resources_ required to run your application.

2.  **Build & Package Code:** Stacktape builds your application code and packages it into deployment artifacts, such as container images or _Lambda function_ zip files.

3.  **Create Initial Resources:** For a new stack, Stacktape creates an _S3 bucket_ to store the deployment artifacts and a _CloudFormation_ template, and an _ECR repository_ to store container images. This step is skipped for subsequent deployments.

4.  **Upload Deployment Artifacts:** Stacktape uploads the artifacts to the _S3 bucket_ and _ECR repository_. To speed up this process, Stacktape uses caching and only uploads new or changed artifacts.

5.  **Deploy Infrastructure Resources:** Stacktape uses the _CloudFormation_ template to deploy your application and all its _infrastructure resources_. If an error occurs, the stack is automatically rolled back to the last working version.

### Hot-Swap Deployments

For even faster deployments, Stacktape offers a **_hot-swap_** mode. If you've only changed your application code, Stacktape can bypass _CloudFormation_ and update your _Lambda functions_ and container resources directly. This can reduce deployment times from minutes to seconds.

## Stack Resources

You can inspect all the resources in your deployed stack in the [Stacktape console](https://console.stacktape.com/).

### Naming Conventions

Stacktape uses a consistent naming convention for all your resources, which makes them easy to find in the AWS console.

For example, if you deploy a `function` named `myLambda` to the `dev` stage of a project named `my-project`, the _Lambda function_ in AWS will be named `my-project-dev-myLambda`.

### CloudFormation Template

You can view the complete _CloudFormation_ template for your stack in the Stacktape console. This allows you to see exactly how your AWS resources are configured.

## How Stacktape Extends AWS

Stacktape builds on top of AWS to provide a richer and more seamless developer experience.

### Direct AWS API Calls

While _CloudFormation_ is great for managing infrastructure, some tasks are outside its scope. Stacktape communicates directly with various AWS services to:

-   Upload deployment artifacts.
-   Monitor deployment progress.
-   Perform _hot-swap_ deployments.
-   Detect the root cause of container failures.
-   And much more.

### Third-Party Resources

Stacktape allows you to provision resources from third-party providers like [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) and [Upstash](https://upstash.com/) as if they were native AWS resources.

Stacktape manages these resources using open-source _CloudFormation_ extensions, which are automatically installed and updated for you.