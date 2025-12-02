# Overview

Custom resources allow you to create resources with custom provisioning logic. This enables you to define the logic for creating, updating, and deleting resources, giving you the ability to provision any type of resource that is not natively supported by Stacktape or _Cloudformation_. This way, you can manage all your related resources in a single stack.

A common use case for custom resources is provisioning non-AWS resources. While AWS offers a vast array of services, a third-party solution may better fit your needs (e.g., using Auth0 instead of Cognito, or Algolia instead of OpenSearch).