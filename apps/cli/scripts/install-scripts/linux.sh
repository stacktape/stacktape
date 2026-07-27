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
archive_name="linux.tar.gz"
archive_source_url="https://github.com/stacktape/stacktape/releases/download/$version/$archive_name"
checksums_source_url="https://github.com/stacktape/stacktape/releases/download/$version/SHA256SUMS"
# SHA256SUMS is required starting with 3.7.1. Older pinned releases remain installable.
# The direct installer fetches both files from GitHub Releases, so this is an integrity check, not independent authenticity.
checksum_required_for_version() {
    candidate=${1#v}
    candidate=${candidate#V}
    core_version=${candidate%%-*}
    core_version=${core_version%%+*}
    previous_ifs=$IFS
    IFS=.
    set -- $core_version
    IFS=$previous_ifs
    [ "$#" -eq 3 ] || return 0
    major=${1:-}
    minor=${2:-}
    patch=${3:-}
    case "$major:$minor:$patch" in *[!0-9:]*) return 0 ;; esac
    [ -n "$major" ] && [ -n "$minor" ] && [ -n "$patch" ] || return 0
    [ "$major" -gt 3 ] && return 0
    [ "$major" -lt 3 ] && return 1
    [ "$minor" -gt 7 ] && return 0
    [ "$minor" -lt 7 ] && return 1
    [ "$patch" -ge 1 ]
}
checksum_required=false
if checksum_required_for_version "$version"; then
    checksum_required=true
fi

INSTALL_DIR="$HOME/.stacktape/bin"
mkdir -p "$INSTALL_DIR"

# Progress bar helper
print_progress() {
    bytes="$1"
    length="$2"
    [ "$length" -gt 0 ] || return 0

    width=50
    percent=$(( bytes * 100 / length ))
    [ "$percent" -gt 100 ] && percent=100
    on=$(( percent * width / 100 ))
    off=$(( width - on ))

    filled=""
    i=0
    while [ $i -lt $on ]; do
        filled="${filled}#"
        i=$((i + 1))
    done

    empty=""
    i=0
    while [ $i -lt $off ]; do
        empty="${empty}-"
        i=$((i + 1))
    done

    printf "\r${CYAN}%s%s %3d%%${NC}" "$filled" "$empty" "$percent" >&2
}

download_with_progress() {
    url="$1"
    output="$2"

    # Get content length first
    length=$(curl -sI -L "$url" 2>/dev/null | tr -d '\r' | grep -i '^content-length:' | tail -1 | awk '{print $2}')
    length=${length:-0}

    if [ "$length" -gt 0 ] && [ -t 2 ]; then
        # Download with progress tracking
        curl -sL "$url" 2>/dev/null | {
            bytes=0
            while IFS= read -r chunk || [ -n "$chunk" ]; do
                printf '%s' "$chunk"
                chunk_len=${#chunk}
                bytes=$((bytes + chunk_len + 1))
                print_progress "$bytes" "$length"
            done
        } > "$output"
        printf "\n" >&2
    else
        # Fallback: simple download with curl progress
        curl -# -L -o "$output" "$url"
    fi
}

download_and_install() {
    print_message info "\n${MUTED}Installing ${NC}stacktape ${MUTED}version: ${NC}$version"
    
    tmp_dir="${TMPDIR:-/tmp}/stacktape_install_$$"
    mkdir -p "$tmp_dir"
    archive_path="$tmp_dir/stacktape.tar.gz"

    # Use curl's built-in progress bar (works well on Linux)
    curl -# -fL -o "$archive_path" "$archive_source_url"
    if [ "$checksum_required" = true ]; then
        checksums_path="$tmp_dir/SHA256SUMS"
        curl -fsSL -o "$checksums_path" "$checksums_source_url"
        expected_checksum=$(awk -v name="$archive_name" '$2 == name { print $1 }' "$checksums_path")
        if [ "${#expected_checksum}" -ne 64 ]; then
            print_message error "Error: Missing or invalid checksum for $archive_name."
            rm -rf "$tmp_dir"
            exit 1
        fi
        if command -v sha256sum >/dev/null 2>&1; then
            actual_checksum=$(sha256sum "$archive_path" | awk '{ print $1 }')
        elif command -v shasum >/dev/null 2>&1; then
            actual_checksum=$(shasum -a 256 "$archive_path" | awk '{ print $1 }')
        else
            print_message error "Error: 'sha256sum' or 'shasum' is required to verify the download."
            rm -rf "$tmp_dir"
            exit 1
        fi
        if [ "$actual_checksum" != "$expected_checksum" ]; then
            print_message error "Error: Checksum verification failed for $archive_name."
            rm -rf "$tmp_dir"
            exit 1
        fi
    fi

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

# Determine shell config file
XDG_CONFIG_HOME=${XDG_CONFIG_HOME:-$HOME/.config}
current_shell=$(basename "$SHELL")

case $current_shell in
    fish)
        config_files="$HOME/.config/fish/config.fish"
        ;;
    zsh)
        config_files="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv $XDG_CONFIG_HOME/zsh/.zshrc"
        ;;
    bash)
        config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile"
        ;;
    *)
        config_files="$HOME/.bashrc $HOME/.profile"
        ;;
esac

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

# Setup completions if available
setup_completions() {
    cfg_file=$1
    completions_path="$INSTALL_DIR/completions"
    
    case $current_shell in
        bash)
            completions_file="$completions_path/bash.sh"
            ;;
        zsh)
            completions_file="$completions_path/zsh.sh"
            ;;
        *)
            return
            ;;
    esac
    
    if [ -f "$completions_file" ] && [ -f "$cfg_file" ]; then
        completion_line="[ -s \"$completions_file\" ] && . \"$completions_file\""
        if ! grep -Fq "$completions_file" "$cfg_file" 2>/dev/null; then
            printf "%s\n" "$completion_line" >> "$cfg_file"
        fi
    fi
}

if [ -z "$config_file" ]; then
    print_message muted "No config file found for $current_shell. Manually add to PATH:"
    print_message info "  export PATH=\"$INSTALL_DIR:\$PATH\""
elif ! echo ":$PATH:" | grep -q ":$INSTALL_DIR:"; then
    case $current_shell in
        fish)
            add_to_path "$config_file" "fish_add_path $INSTALL_DIR"
            ;;
        *)
            add_to_path "$config_file" "export PATH=\"$INSTALL_DIR:\$PATH\""
            setup_completions "$config_file"
            ;;
    esac
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
