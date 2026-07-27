import os
import json
import torch


def main():
    input_data = json.loads(os.environ.get("INPUT_DATA", "{}"))
    print(f"Running inference with input: {input_data}")

    # Check GPU availability
    if torch.cuda.is_available():
        device = torch.device("cuda")
        print(f"Using GPU: {torch.cuda.get_device_name(0)}")
        print(
            f"GPU Memory: {torch.cuda.get_device_properties(0).total_mem / 1024**3:.1f} GB"
        )
    else:
        device = torch.device("cpu")
        print("GPU not available, using CPU")

    # Your inference logic here:
    # - Load a model from S3 or Hugging Face
    # - Process the input data
    # - Save results to the output S3 bucket

    # Example: simple tensor operation on GPU
    tensor = torch.randn(1000, 1000, device=device)
    result = torch.mm(tensor, tensor.t())

    output_bucket = os.environ.get("STP_OUTPUT_BUCKET_NAME", "unknown")
    print(f"Inference complete. Results would be saved to bucket: {output_bucket}")
    print(f"Result shape: {result.shape}, mean: {result.mean().item():.4f}")


if __name__ == "__main__":
    main()
