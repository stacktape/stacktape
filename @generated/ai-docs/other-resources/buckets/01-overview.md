# Overview

Buckets provide a way to store and retrieve any amount of data, at any time, from anywhere on the web. They are a good choice for a variety of use cases, including hosting websites, storing user-generated content, and for backup and disaster recovery.

A bucket is a collection of objects, where an object is a file and any metadata that describes it. Buckets have a flat structure, but you can simulate a folder hierarchy by using a common prefix for your object names (e.g., `photos/`).

Under the hood, Stacktape uses [Amazon S3](https://aws.amazon.com/s3/) for buckets.