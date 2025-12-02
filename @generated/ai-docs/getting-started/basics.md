# Basics

This guide introduces the fundamental concepts of Stacktape.

## Projects, Stages, and Stacks

Stacktape uses a simple hierarchy to organize your applications:

- **Project:** A container for all versions of a single application.
- **Stage:** An isolated environment within a project. Common stages include `development`, `staging`, and `production`. Each _stage_ is a separate copy of your application, so changes in one won't affect others.
- **Stack:** A deployed _stage_. A _stack_ includes your application code and all the _infrastructure resources_ it needs to run, such as databases, file storage, and networks.

Every time you deploy a _stage_, Stacktape creates a corresponding _stack_ on AWS.

## The Configuration File

To deploy a _stack_, you need a configuration file. This file, written in YAML, JSON, or TypeScript, is a blueprint for your application. It defines:

- Your application's services (e.g., APIs, background workers).
- The _infrastructure resources_ your application needs (e.g., databases, caches).
- Build and packaging instructions.
- Environment-specific settings.

A typical Stacktape configuration file is around 30 lines long, while the equivalent raw _Cloudformation_ template would be over 1,200 lines.

## How Deployment Works

When you deploy a _stage_, Stacktape performs the following steps:

1.  **Packages your application code** into deployment artifacts (_Lambda function_ bundles or container images).
2.  **Uploads the artifacts** to a secure storage (_S3 bucket_ and _ECR repository_).
3.  **Deploys your stack** using _Cloudformation_, which provisions all the necessary _infrastructure resources_.

If a deployment fails, Stacktape automatically rolls it back to the last working version, ensuring your application is never left in a broken state.

When you redeploy, Stacktape intelligently updates only the resources that have changed. If only your application code has changed, it will perform a "hot-swap" to update the code in seconds, without redeploying the entire stack.

## What You Need to Deploy

To deploy a stack, you need to provide four things:

1.  **A configuration file**.
2.  **An _AWS region_** (the geographic location where your stack will be deployed).
3.  **A stage name** (e.g., `dev`, `staging`, `prod`).
4.  **A project name** (a unique identifier for your application).