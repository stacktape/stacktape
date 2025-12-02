# Overview

A batch job is a compute resource designed to run a containerized task until it completes. The execution is triggered by an event, such as an HTTP request, a message in a queue, or an object uploaded to a bucket.

A key feature of batch jobs is the ability to use _spot instances_, which can reduce compute costs by up to 90%.

Like other Stacktape compute resources, batch jobs are _serverless_, meaning you don't need to manage the underlying infrastructure. Stacktape handles server provisioning, scaling, and security for you. You can also equip your batch job's environment with a GPU in addition to CPU and RAM.