#!/bin/sh
set -eu

APP=stacktape

# Colors (ANSI escape codes)
MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

print_message() {
    level=$1
    message=$2
    case $level in
        info) printf "${NC}${message}${NC}\n" ;;
        muted) printf "${MUTED}${message}${NC}\n" ;;
        success) printf "${GREEN}${message}${NC}\n" ;;
        error) printf "${RED}${message}${NC}\n" ;;
    esac
}

# Check required commands
if ! command -v curl >/dev/null 2>&1; then
    print_message error "Error: 'curl' is required but not installed."
    exit 1
fi

if ! command -v tar >/dev/null 2>&1; then
    print_message error "Error: 'tar' is required but not installed."
    exit 1
fi

version=${STACKTAPE_VERSION:-"<<DEFAULT_VERSION>>"}
archive_source_url="https://github.com/stacktape/stacktape/releases/download/$version/alpine.tar.gz"

INSTALL_DIR="$HOME/.stacktape/bin"
mkdir -p "$INSTALL_DIR"

download_and_install() {
    print_message info "\n${MUTED}Installing ${NC}stacktape ${MUTED}version: ${NC}$version"
    
    tmp_dir="${TMPDIR:-/tmp}/stacktape_install_$$"
    mkdir -p "$tmp_dir"
    archive_path="$tmp_dir/stacktape.tar.gz"

    # Use curl's built-in progress bar
    curl -# -fL -o "$archive_path" "$archive_source_url"

    tar -xzf "$archive_path" -C "$INSTALL_DIR"

    # Set executable permissions
    chmod +x "$INSTALL_DIR/stacktape"
    [ -f "$INSTALL_DIR/session-manager-plugin/smp" ] && chmod +x "$INSTALL_DIR/session-manager-plugin/smp"
    [ -f "$INSTALL_DIR/pack/pack" ] && chmod +x "$INSTALL_DIR/pack/pack"
    [ -f "$INSTALL_DIR/nixpacks/nixpacks" ] && chmod +x "$INSTALL_DIR/nixpacks/nixpacks"
    [ -f "$INSTALL_DIR/esbuild/exec" ] && chmod +x "$INSTALL_DIR/esbuild/exec"

    # Create stp symlink
    ln -sf "$INSTALL_DIR/stacktape" "$INSTALL_DIR/stp"

    rm -rf "$tmp_dir"
}

download_and_install

# Alpine Linux uses ash shell
config_files="$HOME/.profile /etc/profile"

# Find existing config file
config_file=""
for file in $config_files; do
    if [ -f "$file" ]; then
        config_file=$file
        break
    fi
done

# Add to PATH if not already there
add_to_path() {
    cfg_file=$1
    command=$2

    if grep -Fq "$INSTALL_DIR" "$cfg_file" 2>/dev/null; then
        print_message muted "PATH already configured in $cfg_file"
    elif [ -w "$cfg_file" ]; then
        printf "\n# stacktape\n%s\n" "$command" >> "$cfg_file"
        print_message muted "Added stacktape to \$PATH in $cfg_file"
    else
        print_message muted "Manually add to $cfg_file: $command"
    fi
}

if [ -z "$config_file" ]; then
    # Create .profile if it doesn't exist
    config_file="$HOME/.profile"
    touch "$config_file"
fi

if ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
    add_to_path "$config_file" "export PATH=\"$INSTALL_DIR:\$PATH\""
fi

# GitHub Actions support
if [ -n "${GITHUB_ACTIONS-}" ] && [ "${GITHUB_ACTIONS}" = "true" ]; then
    echo "$INSTALL_DIR" >> "$GITHUB_PATH"
    print_message muted "Added $INSTALL_DIR to \$GITHUB_PATH"
fi

# Print success message with ASCII logo
printf "\n"
printf "${MUTED}     _____ _             _    _                    ${NC}\n"
printf "${MUTED}    / ____| |           | |  | |                   ${NC}\n"
printf "${GREEN}   | (___ | |_ __ _  ___| | _| |_ __ _ _ __   ___  ${NC}\n"
printf "${GREEN}    \\___ \\| __/ _\` |/ __| |/ / __/ _\` | '_ \\ / _ \\ ${NC}\n"
printf "${GREEN}    ____) | || (_| | (__|   <| || (_| | |_) |  __/ ${NC}\n"
printf "${GREEN}   |_____/ \\__\\__,_|\\___|_|\\_\\\\__\\__,_| .__/ \\___| ${NC}\n"
printf "${GREEN}                                      | |          ${NC}\n"
printf "${GREEN}                                      |_|          ${NC}\n"
printf "\n"
printf "${BOLD}${GREEN}Stacktape was installed successfully!${NC}\n"
printf "\n"
printf "${MUTED}To get started, run:${NC}\n"
printf "\n"
printf "  stacktape init\n"
printf "\n"
printf "${MUTED}For more information visit ${NC}https://docs.stacktape.com\n"
printf "\n"
