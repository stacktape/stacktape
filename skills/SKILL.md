# Stacktape Skills

This directory contains skills for using Stacktape to develop, deploy, and manage applications on AWS.

## Available Skills

1.  **[Stacktape Configuration](./stacktape-config.md)**
    -   **Goal**: Write infrastructure-as-code configurations (`stacktape.ts`).
    -   **Use when**: Creating new resources, modifying infrastructure, setting up databases/functions.

2.  **[Stacktape Development](./stacktape-dev.md)**
    -   **Goal**: Run applications locally (`stacktape dev`).
    -   **Use when**: Testing code changes, running the app locally, debugging logic with fast feedback loop.

3.  **[Stacktape CLI & Operations](./stacktape-cli.md)**
    -   **Goal**: Deploy, manage, and debug deployed stacks.
    -   **Use when**: Deploying to production/staging, viewing logs, checking metrics, managing secrets, deleting stacks.

## Usage

Load the specific skill relevant to your current task.

-   For **coding and config**, load `stacktape-config.md`.
-   For **running and testing**, load `stacktape-dev.md`.
-   For **deploying and observing**, load `stacktape-cli.md`.
