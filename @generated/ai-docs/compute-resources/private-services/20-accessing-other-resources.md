# Accessing other resources

By default, AWS resources cannot communicate with each other. Access must be granted using _IAM_ permissions.

Stacktape automatically configures the necessary permissions for the services it manages. For example, it allows a private service to write logs to CloudWatch.

However, if your application needs to access other resources, you must grant permissions manually. You can do this in two ways: