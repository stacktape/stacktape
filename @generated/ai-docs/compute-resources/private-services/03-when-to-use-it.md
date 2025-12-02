# When to use it

This table helps you choose the right container-based resource for your needs:

| **Resource type**                                                         | **Description**                                                                      | **Use-cases**                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [web-service](../../compute-resources/web-services//index.md)                           | A container with a **public endpoint and URL**.                                      | Public APIs, websites                          |
| [private-service](../../compute-resources/private-services//index.md)                   | A container with a **private endpoint**, accessible only within your stack.          | Private APIs, internal services                |
| [worker-service](../../compute-resources/worker-services//index.md)                     | A container that runs continuously but is **not directly accessible**.               | Background processing, message queue consumers |
| [multi-container-workload](../../compute-resources/multi-container-workloads//index.md) | A customizable workload with multiple containers, where you define the accessibility of each one. | Complex, multi-component services              |
| [batch-job](../../compute-resources/batch-jobs//index.md)                               | A container that runs a single job and then terminates.                              | One-off or scheduled data processing tasks     |