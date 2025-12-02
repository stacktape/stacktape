# Overview

A bastion server, or jump host, is a virtual machine that provides secure access to resources that are isolated within a private network (_VPC_). This is useful for managing resources like databases or Redis clusters that don't have a public endpoint.

Connections to the bastion server are established using [SSM Session Manager](./09-ssm-sessions.md), which leverages your _IAM_ permissions for authentication. This eliminates the need to expose any ports, providing a highly secure way to access your private resources.