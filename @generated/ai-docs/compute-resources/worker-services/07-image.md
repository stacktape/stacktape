# Image

A worker service runs a Docker image. You can provide this image in four ways:

- **[stacktape-image-buildpack](../../configuration/packaging.md):** Automatically packages your code without needing a Dockerfile.
- **[external-buildpack](../../configuration/packaging.md):** Uses external buildpacks to create an image.
- **[custom-dockerfile](../../configuration/packaging.md):** Builds an image from your own Dockerfile.
- **[prebuilt-images](../../configuration/packaging.md):** Uses an existing image from a container registry.