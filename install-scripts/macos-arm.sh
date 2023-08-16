#!/bin/sh
# Based on Deno installer: Copyright 2019 the Deno authors. All rights reserved. MIT license.

set -e

os=$(uname -s)
arch=$(uname -m)
version=${STACKTAPE_VERSION:="<<DEFAULT_VERSION>>"}

archive_source_url=https://github.com/stacktape/stacktape/releases/download/$version/macos-arm.tar.gz

bin_dir_path="$HOME/.stacktape/bin"
executable_file_path="$bin_dir_path/stacktape"
alt_executable_file_path="$bin_dir_path/stp"
esbuild_executable_file_path="$bin_dir_path/esbuild/exec"
session_manager_plugin_executable_file_path="$bin_dir_path/session-manager-plugin/smp"

if [ ! -d "$bin_dir_path" ]; then
 	mkdir -p "$bin_dir_path"
fi

echo "Installing version $version from $archive_source_url"

curl -q --fail --location --progress-bar --output "$executable_file_path.tar.gz" "$archive_source_url"
cd $bin_dir_path
tar xzf "$executable_file_path.tar.gz"
chmod +x "$executable_file_path"
chmod +x "$esbuild_executable_file_path"
chmod +x "$session_manager_plugin_executable_file_path"
rm "$executable_file_path.tar.gz"

ln -sf $executable_file_path $alt_executable_file_path

etc_paths_path="/etc/paths.d/stacktape"

if command -v stacktape >/dev/null; then
  echo "Stacktape was successfully installed to $bin_dir_path"
	echo "Run 'stacktape help' to get started."
else
  echo "\nStacktape was successfully installed to $bin_dir_path"
  echo "To try the installation, you can use '$executable_file_path help' command."
  echo "\033[1mTo use 'stacktape' and 'stp' aliases, you need to add them to \$PATH. To do that, run:\n\033[0m"
  echo "\033[1m  sudo touch $etc_paths_path && echo $bin_dir_path | sudo tee $etc_paths_path\n\033[0m"
  echo "You might need to restart the terminal session or re-log to your account before the aliases will be available to use."
fi
