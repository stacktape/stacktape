# When to use

If you're unsure which compute resource to use, this table provides a comparison of container-based resources in Stacktape:

| **Resource type**                                                         | **Description**                                                                      | **Use-cases**                                  |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------- |
| [web-service](../web-services/index.md)                           | continuously running container with **public endpoint and URL**                      | public APIs, websites                          |
| [private-service](../private-services/index.md)                   | continuously running container with **private endpoint**                             | private APIs, services                         |
| [worker-service](../worker-services/index.md)                     | continuously running container **not accessible from outside**                       | continuous processing                          |
| [multi-container-workload](../multi-container-workloads/index.md) | custom multi container workload - you can customize accessibility for each container | more complex use-cases requiring customization |
| [batch-job](../batch-jobs/index.md)                               | simple container **job** - container is destroyed after job is done                  | one-off/scheduled processing jobs              |