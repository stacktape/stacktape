#!/bin/sh
# Based on Deno installer: Copyright 2019 the Deno authors. All rights reserved. MIT license.
if [ -t 0 ] ; then
  Format_Off="$(tput sgr0)"
  Green="$(tput setaf 2)"
  White="$(tput setaf 7)"
  Dim="$(tput dim)"
  Bold="$(tput bold)"
else
  Format_Off=""
  Green=""
  White=""
  Dim=""
  Bold=""
fi

info() {
    echo "${Dim}$@${Format_Off}"
}
info_bold() {
    echo "${Bold}${Dim}$@${Format_Off}"
}
success() {
    echo "${Bold}${Green}$@${Format_Off}"
}
bold() {
    echo "${Bold}$@${Format_Off}"
}

set -e

os=$(uname -s)
arch=$(uname -m)
version=${STACKTAPE_VERSION:="<<DEFAULT_VERSION>>"}

archive_source_url=https://github.com/stacktape/core/releases/download/$version/alpine.tar.gz

bin_dir_path="$HOME/.stacktape/bin"
executable_file_path="$bin_dir_path/stacktape"
alt_executable_file_path="$bin_dir_path/stp"
esbuild_executable_file_path="$bin_dir_path/esbuild/exec"
session_manager_plugin_executable_file_path="$bin_dir_path/session-manager-plugin/smp"
pack_executable_file_path="$bin_dir_path/pack/pack"
nixpacks_executable_file_path="$bin_dir_path/nixpacks/nixpacks"


if [ ! -d "$bin_dir_path" ]; then
 	mkdir -p "$bin_dir_path"
fi

echo "${Bold}${Green}Installing ${White}version ${Green}$version ${Format_Off}${Dim}from $archive_source_url${Format_Off}"

curl -q --fail --location --progress-bar --output "$executable_file_path.tar.gz" "$archive_source_url"
cd $bin_dir_path
tar xzf "$executable_file_path.tar.gz"
chmod +x "$executable_file_path"
chmod +x "$esbuild_executable_file_path"
chmod +x "$session_manager_plugin_executable_file_path"
chmod +x "$pack_executable_file_path"
chmod +x "$nixpacks_executable_file_path"

rm "$executable_file_path.tar.gz"

ln -sf $executable_file_path $alt_executable_file_path

user_profile_file_path="$HOME/.profile"
set_path_line="export PATH=\$PATH:$bin_dir_path"
if ! grep -q "$bin_dir_path" $user_profile_file_path; then
  echo "$set_path_line" >> $user_profile_file_path
  if command -v source &> /dev/null
  then
    source $user_profile_file_path
  else
    . $user_profile_file_path
  fi
fi

if [ "$GITHUB_ACTIONS" = true ]; then
  echo "$bin_dir_path" >> $GITHUB_PATH
fi

if command -v stacktape >/dev/null; then
  echo "Stacktape was successfully installed to $bin_dir_path"
	echo "Run 'stacktape help' to get started."
else
  echo "\nStacktape was successfully installed to $bin_dir_path"
  echo "To try the installation, you can use '$executable_file_path help' command."
  echo "\033[1mTo use 'stacktape' and 'stp' aliases, you need to manually add Stacktape bin folder to \$PATH.\n\033[0m"
  echo "\033[1m  To add it only for the current profile, add 'export PATH=\$PATH:$bin_dir_path' to '$user_profile_file_path'.\033[0m"
  echo "\033[1m  To add it for every profile on the system, add 'PATH=\$PATH:$bin_dir_path' to '/etc/profile'.\n\033[0m"
  echo "You might need to restart the terminal session or re-log to your account before the aliases will be available to use."
fi

