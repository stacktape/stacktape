- WebSocket API built with [Socket.io](https://socket.io/) and scaled across multiple containers.
- Uses a [Redis cluster](https://docs.stacktape.com/resources/redis-clusters/) for session synchronization between
  container instances, with an
  [Application Load Balancer](https://docs.stacktape.com/resources/application-load-balancers/) for connection routing.
- Runs in a [multi-container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads/) with
  automatic scaling.
