- GPU-capable [batch job](https://docs.stacktape.com/compute-resources/batch-jobs/) for image classification using
  TensorFlow.
- Upload a `.zip` of images to the input S3 bucket — the job automatically classifies them using a pre-trained
  EfficientNet model and saves results to the output bucket.
- Uses [spot instances](https://docs.stacktape.com/compute-resources/batch-jobs/#spot-instances) for up to 90% cost
  savings. Perfect as a starting point for any ML batch processing workload.
