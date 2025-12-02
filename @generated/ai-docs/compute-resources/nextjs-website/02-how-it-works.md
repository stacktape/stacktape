# How it Works

Stacktape uses the open-source project [OpenNEXT](https://open-next.js.org/) to build your Next.js application, making it compatible with AWS Lambda. Behind the scenes, Stacktape provisions a set of AWS resources to host your app:

| **Component** | **Type** | **Description** |
| --- | --- | --- |
| Server function | `Lambda` or `Lambda@Edge` | Runs your Next.js server logic. |
| Asset Bucket | `S3 bucket` | Stores static assets (like images, CSS) and cached assets. |
| Image optimization function | `Lambda` | Handles on-the-fly image optimization for the Next.js `

### Assumptions

- **Monthly Visitors**: 300,000
- **Page Views per Visitor**: 3
- **Cache Hit Rate**: 50% of page views are served from the _CDN_ cache.
- **API Calls per Page**: 2 API calls for each page view that hits the server.

This results in:

- **Total Page Views**: 900,000
- **Server Page Views**: 450,000
- **Total Server Requests**: 1,350,000 (450,000 page views + 900,000 API calls)

### Monthly Cost Estimate

| Service | Calculation | Estimated Cost |
| --- | --- | --- |
| **CloudFront** | Within free tier limits | **$0** |
| **AWS Lambda** | 675,000 requests, 100ms duration each | **$1.26** |
| **S3 Storage** | 675,000 reads and writes | **$3.65** |
| **DynamoDB** | 675,000 reads and writes | **$1.01** |
| **Total** | | **~$5.92 per month** |