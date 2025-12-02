# Overview

A Content Delivery Network (CDN) is a geographically distributed network of servers that work together to provide fast delivery of internet content. By caching content in locations closer to your users, a _CDN_ can significantly reduce latency and decrease the load on your application's origin servers. It can also improve security by providing a layer of defense against DDoS attacks.

Under the hood, Stacktape uses [Amazon CloudFront](https://aws.amazon.com/cloudfront/), which has over 300 points of presence (PoPs) worldwide.