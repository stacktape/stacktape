# Advantages

- **Predictable pricing:** ALBs have a predictable pricing model, which can be more cost-effective than HTTP API Gateways for high-traffic applications.
- **Scalability:** ALBs can handle millions of requests per second and scale automatically as traffic grows.
- **Health checks:** When used with container workloads, an ALB periodically checks the health of each container and only routes traffic to healthy ones.
- **Content-based routing:** ALBs can route requests to different services based on the content of the request, such as the URL path, HTTP header, or query string.
- **Security:** You can offload SSL/TLS termination to the load balancer, encrypting traffic between the client and the ALB.