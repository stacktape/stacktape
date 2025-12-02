- simple Websocket API built using [Socket.io](https://socket.io/).
- The application runs in a
  [container workload](https://docs.stacktape.com/compute-resources/multi-container-workloads/) and uses
  [Upstash redis](https://docs.stacktape.com/resources/upstash-redis-databases/) to store the session data. The requests
  are routed using [Application Load Balancer](https://docs.stacktape.com/resources/application-load-balancers/).
