# Overview

Hosting buckets are designed for serving static content, such as single-page applications or static websites. They distribute your content through a _CDN_ with over 300 points of presence (PoPs) worldwide, ensuring low latency for your users. Hosting buckets are also secure by default, with automatic TLS.

If you need more control over the bucket's configuration, consider using a standard [bucket](../../other-resources/buckets/index.md) instead.

Under the hood, a hosting bucket uses two main components:

-   An S3 bucket to store your assets.
-   A CloudFront _CDN_ distribution to cache and serve your assets.