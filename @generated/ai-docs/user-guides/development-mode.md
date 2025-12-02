# Development mode

Stacktape provides a development mode that is designed to be:

*   **Practical**: Fast feedback loop.
*   **Correct**: As close to the production environment as possible.
*   **Intuitive**: Easy to use.
*   **Enjoyable**: All the information you need in one place, with pretty-printed logs.

Different compute resources have different ways of being developed.

## Developing container workloads

The recommended way to develop a container workload is to use the [`dev` command](../../cli/commands/dev.md).

For example, to develop the `api-container` in a workload named `apiServer`, you would run:

```bash
stacktape dev --resourceName apiServer --stage <<your-stage>>
```

This will run the container locally, map all the `containerPort`s specified in the `events` section to the host machine, and continuously pretty-print the container's logs.

Stacktape emulates the deployed environment as closely as possible:

*   The container's `environment` variables, including those referenced by `$ResourceParam()` and `$Secret()` directives, are automatically downloaded and injected.
*   Temporary credentials for the container's [assumed role](https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html) are injected, so your locally running container will have the exact same _IAM_ permissions as the deployed version.

The container is rebuilt and restarted when you type `rs` and press `Enter` in the terminal, or when you use the `--watch` option and a source code file changes.

## Developing Lambda functions

The recommended way to develop a Lambda function is to use the [`dev` command](../../cli/commands/dev.md).

```bash
stacktape dev --resourceName getPosts --stage <<your-stage>>
```

This will quickly build and deploy your function's code and continuously watch and pretty-print its logs to the terminal.

The function is rebuilt and redeployed when you type `rs` and press `Enter` in the terminal, or when you use the `--watch` option and a source code file changes.

## Developing batch jobs

A local development mode for batch jobs is currently under development.