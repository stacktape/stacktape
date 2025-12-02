# Overview

The AWS Cloud Development Kit (CDK) allows you to model your application infrastructure using familiar programming languages.

A fundamental building block of the CDK is the **construct**. A construct is a reusable cloud component that encapsulates everything AWS needs to create the component. It can represent a single AWS resource, such as an _S3 bucket_, or be a higher-level abstraction composed of multiple related AWS resources.

Stacktape allows you to extend your infrastructure by adding AWS CDK constructs to your stack. The AWS resources that are part of the construct are then deployed alongside the other resources created by Stacktape.

To learn more about constructs, see the [AWS documentation](https://docs.aws.amazon.com/cdk/v2/guide/constructs.html). You can also discover additional constructs from AWS, third parties, and the open-source community on the [Construct Hub](https://constructs.dev/).