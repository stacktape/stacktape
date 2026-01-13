
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

archive_source_url=https://github.com/stacktape/stacktape/releases/download/$version/linux.tar.gz

bin_dir_path="$HOME/.stacktape/bin"
executable_file_path="$bin_dir_path/stacktape"
alt_executable_file_path="$bin_dir_path/stp"
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
chmod +x "$session_manager_plugin_executable_file_path"
chmod +x "$pack_executable_file_path"
chmod +x "$nixpacks_executable_file_path"

rm "$executable_file_path.tar.gz"

ln -sf $executable_file_path $alt_executable_file_path

case $(basename "$SHELL") in
  bash)
    user_profile_file_path="$HOME/.bashrc"
    completions_file_path="$bin_dir_path/completions/bash.sh"
    ;;
  zsh)
    user_profile_file_path="$HOME/.zshrc"
    completions_file_path="$bin_dir_path/completions/zsh.sh"
    ;;
  *)
    user_profile_file_path="$HOME/.profile"
    ;;
esac

touch "$user_profile_file_path"
set_path_line="export PATH=\$PATH:$bin_dir_path"
if ! grep -q "$bin_dir_path" "$user_profile_file_path"; then
  echo "# Added by Stacktape installer" >> "$user_profile_file_path"
  echo "$set_path_line" >> "$user_profile_file_path"
fi

# Install command-line completions installation if supported
if [ -n "$completions_file_path" ]; then
  echo "Installing completions..."
  set_completion_line="[ -s \"$completions_file_path\" ] && \. $completions_file_path"
  if ! grep -q "$completions_file_path" "$user_profile_file_path"; then
    echo "$set_completion_line" >> "$user_profile_file_path"
  fi
fi

if [ "$GITHUB_ACTIONS" = true ]; then
  echo "$bin_dir_path" >> "$GITHUB_PATH"
fi

if command -v stacktape >/dev/null; then
  echo "$(success "Stacktape was successfully installed") to $bin_dir_path"
	info "Run 'stacktape help' to get started."
elif [ "$user_profile_file_path" != "$HOME/.profile" ]; then
  echo "$(success "Stacktape was successfully installed") to $bin_dir_path"
  info_bold "To use 'stacktape' and 'stp' aliases, you need to reload your terminal."
	info "After reload, run 'stacktape help' to get started."
else
  echo "$(success "Stacktape was successfully installed") to $bin_dir_path"
  info "Run '$executable_file_path help' to get started."
  info_bold "You might need to restart the terminal session or re-log to your account before the aliases will be available to use."
  info "To manually setup 'stacktape' and 'stp' aliases, you need to add Stacktape bin folder to \$PATH."
  info "To add it only for the current profile, add 'export PATH=\$PATH:$bin_dir_path' to '$user_profile_file_path'."
  info "To add it for every profile on the system, add 'PATH=\$PATH:$bin_dir_path' to '/etc/profile'."
fi

