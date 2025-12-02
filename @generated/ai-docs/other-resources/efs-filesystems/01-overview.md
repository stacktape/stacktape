# Overview

An EFS filesystem provides simple, scalable, and elastic file storage for your applications. It allows shared access to data using a traditional file permissions model and a hierarchical directory structure. Files stored in an EFS filesystem are persistent, meaning they remain available even if the container or Lambda function that created them is no longer running.

A single filesystem can be mounted by thousands of compute resources concurrently, including Lambda functions and container services. The filesystem is serverless, automatically growing and shrinking as you add and remove files, and you only pay for the storage you use.

Under the hood, Stacktape uses [AWS Elastic File System (EFS)](https://aws.amazon.com/efs/).