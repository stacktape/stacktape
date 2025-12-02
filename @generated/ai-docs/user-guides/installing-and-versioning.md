# Installing and Versioning

## Installing Stacktape

### Using an installation script

After the installation is complete, you may need to manually add the Stacktape bin folder to your `PATH` environment variable. To do so, follow the instructions printed in the terminal.

### Manual installation

To install Stacktape manually, download the appropriate binary from the [GitHub releases page](https://github.com/stacktape/stacktape/releases).

Extract the archive to `~/.stacktape/bin` and add this directory to your `PATH` environment variable.

## Installing a specific version

To install a specific version, set the `STACKTAPE_VERSION` environment variable before running the installation script.

## Semantic versioning

Stacktape follows [semantic versioning](https://semver.org/) as closely as possible.

There may be minor breaking changes in minor versions from time to time, but these are always documented on the [releases page](https://github.com/stacktape/stacktape/releases).