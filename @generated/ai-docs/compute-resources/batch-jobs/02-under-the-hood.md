# Under the hood

Stacktape uses a combination of AWS services to provide a seamless experience for running containerized jobs:

- **_AWS Batch_**: Provisions the virtual machines where your job runs and manages the execution.
- **_AWS Step Functions_**: Manages the job's lifecycle, including retries and timeouts, using a serverless state machine.
- **_AWS Lambda_**: A trigger function that connects the event source to the batch job and starts its execution.

The execution flow is as follows:

1.  An event from an integration (like an API Gateway) invokes the trigger function.
2.  The trigger function starts the **batch job state machine**.
3.  The state machine queues the job in _AWS Batch_.
4.  _AWS Batch_ provisions the necessary resources (like a VM) and runs your containerized job.