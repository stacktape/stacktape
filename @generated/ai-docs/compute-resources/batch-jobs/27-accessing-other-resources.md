# Accessing other resources

By default, AWS resources cannot communicate with each other. Access must be granted explicitly using _IAM_ permissions. Stacktape handles most of this automatically, but for resource-to-resource communication, you need to configure permissions.

[Relational Databases](../../../database-resources/relational-databases.md) are an exception, as they use their own connection-string-based access control.

There are two ways to grant permissions: