#!/bin/sh
# Installs the Stacktape CLI on macOS and Linux, into ~/.stacktape/bin.
#
#   curl -fsSL https://installs.stacktape.com/linux.sh | sh             install
#   curl -fsSL https://installs.stacktape.com/linux.sh | sh -s -- init  install, then start `stacktape init`
#
# Every published .sh name (linux, linux-arm, alpine, macos, macos-arm) serves this script, and each installs the build
# for the machine it runs on.
#
# Environment:
#   STACKTAPE_VERSION=<version>   install this release instead of <<DEFAULT_VERSION>>
#   STACKTAPE_NO_MODIFY_PATH=1    leave shell configuration files alone
#   NO_COLOR=1                    print without colors
#
# Nothing runs until `main` on the last line, so a download cut short installs nothing.
set -eu

INSTALL_DIR="$HOME/.stacktape/bin"
RELEASES_URL=https://github.com/stacktape/stacktape/releases

# Colors only for a terminal that supports them. Logs from CI and coding agents stay plain.
setup_colors() {
    if [ -t 1 ] && [ -z "${NO_COLOR:-}" ] && [ "${TERM:-}" != dumb ]; then
        esc=$(printf '\033')
        MUTED="${esc}[2m"
        RED="${esc}[31m"
        BRAND="${esc}[38;5;73m"
        NC="${esc}[0m"
    else
        MUTED=''
        RED=''
        BRAND=''
        NC=''
    fi
}

say() {
    printf '%s\n' "$*"
}

fail() {
    printf '%s\n' "${RED}Error: $1${NC}" >&2
    shift
    for line in "$@"; do printf '%s\n' "$line" >&2; done
    exit 1
}

# ~/.stacktape/bin instead of /home/someone/.stacktape/bin.
# shellcheck disable=SC2088 # A literal tilde, for display.
tildify() {
    case $1 in
        "$HOME"/*) printf '~/%s' "${1#"$HOME"/}" ;;
        *) printf '%s' "$1" ;;
    esac
}

is_musl() {
    [ -f /etc/alpine-release ] && return 0
    command -v ldd >/dev/null 2>&1 && ldd --version 2>&1 | grep -qi musl
}

# Sets `archive_name` and `platform_name` for the machine this runs on, whichever .sh name was downloaded.
detect_platform() {
    machine=$(uname -m)
    case $(uname -s) in
        Darwin)
            # `hw.optional.arm64` is 1 on Apple silicon even in a Rosetta shell, where `uname -m` says x86_64. An Intel
            # Mac cannot run the Apple silicon build.
            if [ "$(sysctl -n hw.optional.arm64 2>/dev/null || true)" = 1 ]; then
                archive_name=macos-arm.tar.gz
                platform_name='macOS (Apple silicon)'
            else
                archive_name=macos.tar.gz
                platform_name='macOS (Intel)'
            fi
            ;;
        Linux)
            if is_musl; then
                case $machine in
                    x86_64 | amd64) ;;
                    *) fail "Stacktape has no Alpine Linux build for the $machine processor." ;;
                esac
                archive_name=alpine.tar.gz
                platform_name='Alpine Linux x64'
                check_alpine_packages
            else
                case $machine in
                    aarch64 | arm64)
                        archive_name=linux-arm.tar.gz
                        platform_name='Linux ARM64'
                        ;;
                    x86_64 | amd64)
                        archive_name=linux.tar.gz
                        platform_name='Linux x64'
                        ;;
                    *) fail "Stacktape has no Linux build for the $machine processor." ;;
                esac
            fi
            ;;
        MINGW* | MSYS* | CYGWIN*)
            fail "This installer is for macOS and Linux. On Windows, run this in PowerShell:" \
                "  iex \"& { \$(irm https://installs.stacktape.com/windows.ps1) }\""
            ;;
        *) fail "Stacktape has no build for $(uname -s)." ;;
    esac
}

# Bun's musl executable needs the C++ runtime, and the bundled AWS Session Manager plugin needs glibc compatibility.
# A curl-piped installer does not change the system's packages; it names the prerequisite instead.
check_alpine_packages() {
    command -v apk >/dev/null 2>&1 || return 0
    missing_packages=''
    for package in libstdc++ libgcc gcompat; do
        apk info --installed "$package" >/dev/null 2>&1 || missing_packages="$missing_packages $package"
    done
    if [ -n "$missing_packages" ]; then
        fail "Stacktape requires these Alpine packages:$missing_packages" \
            "Install them with: apk add --no-cache libstdc++ libgcc gcompat"
    fi
}

# SHA256SUMS is required starting with 3.7.1. Older pinned releases remain installable.
# The installer fetches both files from GitHub Releases, so this is an integrity check, not independent authenticity.
checksum_required_for_version() {
    candidate=${1#v}
    candidate=${candidate#V}
    core_version=${candidate%%-*}
    core_version=${core_version%%+*}
    previous_ifs=$IFS
    IFS=.
    # shellcheck disable=SC2086 # Splits the version into its parts.
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

cleanup() {
    if [ -n "${curl_pid:-}" ]; then
        kill "$curl_pid" 2>/dev/null || true
        curl_pid=''
        # The progress line hid the cursor.
        printf '\n\033[?25h' >&2
    fi
    if [ -n "${work_dir:-}" ]; then
        rm -rf "$work_dir"
    fi
}

# One redraw of the progress line: the bar and percentage when the size is known, otherwise the megabytes so far.
draw_progress() {
    # ls, not wc -c: BusyBox wc reads the whole file.
    # shellcheck disable=SC2012
    bytes=$(ls -ln "$1" 2>/dev/null | awk '{ print $5 }')
    length=$(awk 'tolower($1) == "content-length:" { length_value = $2 + 0 } END { print length_value + 0 }' "$2" 2>/dev/null || echo 0)
    awk -v bytes="${bytes:-0}" -v total="${length:-0}" -v width="$bar_width" -v color="$BRAND" -v muted="$MUTED" -v reset="$NC" 'BEGIN {
        # Until the first bytes arrive, an empty bar.
        if (total > 0 || bytes == 0) {
            percent = total > 0 ? int(bytes * 100 / total) : 0
            if (percent > 100) percent = 100
            filled = int(percent * width / 100)
            bar = ""
            for (i = 0; i < width; i++) bar = bar (i < filled ? "■" : "･")
            printf "\r%s%s%s %3d%%", color, bar, reset, percent
        } else {
            printf "\r%s%.1f MB%s", muted, bytes / 1048576, reset
        }
    }' >&2
}

# The progress line redraws on a timer, ten times a second at most, so its cost does not grow with the download speed.
# A progress line drawn for every received block can make a large download several times slower in a terminal.
download_with_progress() {
    headers="$work_dir/headers"
    : >"$headers"
    columns=$(stty size </dev/tty 2>/dev/null | awk '{ print $2 }') || columns=''
    # A terminal whose size is unknown reports 0 columns.
    [ "${columns:-0}" -gt 0 ] 2>/dev/null || columns=80
    bar_width=$((columns - 6))
    [ "$bar_width" -gt 50 ] && bar_width=50
    [ "$bar_width" -lt 10 ] && bar_width=10
    printf '\033[?25l' >&2
    curl --fail --silent --show-error --location --retry 2 -D "$headers" -o "$2" "$1" &
    curl_pid=$!
    while kill -0 "$curl_pid" 2>/dev/null; do
        draw_progress "$2" "$headers"
        sleep 0.1 2>/dev/null || sleep 1
    done
    download_status=0
    wait "$curl_pid" || download_status=$?
    curl_pid=''
    [ "$download_status" -eq 0 ] && draw_progress "$2" "$headers"
    printf '\n\033[?25h' >&2
    return "$download_status"
}

download() {
    if [ -t 2 ]; then
        download_with_progress "$1" "$2"
    else
        curl --fail --silent --show-error --location --retry 2 -o "$2" "$1"
    fi
}

verify_checksum() {
    curl --fail --silent --show-error --location --retry 2 -o "$work_dir/SHA256SUMS" "$RELEASES_URL/download/$version/SHA256SUMS" ||
        fail "Could not download the checksums of Stacktape $version."
    expected_checksum=$(awk -v name="$archive_name" '$2 == name { print $1 }' "$work_dir/SHA256SUMS")
    [ "${#expected_checksum}" -eq 64 ] || fail "Missing or invalid checksum for $archive_name."
    if command -v sha256sum >/dev/null 2>&1; then
        actual_checksum=$(sha256sum "$1" | awk '{ print $1 }')
    elif command -v shasum >/dev/null 2>&1; then
        actual_checksum=$(shasum -a 256 "$1" | awk '{ print $1 }')
    else
        fail "'sha256sum' or 'shasum' is required to verify the download."
    fi
    [ "$actual_checksum" = "$expected_checksum" ] ||
        fail "Checksum verification failed for $archive_name. Nothing was installed."
}

# A release archive is a complete installation snapshot. It is unpacked beside the installation first, so a broken
# download changes nothing. Then each of its top-level entries replaces the installed one by a rename, which also
# works while an older stacktape is running.
install_archive() {
    staging_dir="$work_dir/staging"
    mkdir -p "$staging_dir"
    tar -xzf "$1" -C "$staging_dir" || fail "Could not unpack $archive_name. Nothing was installed."
    [ -f "$staging_dir/stacktape" ] || fail "$archive_name does not contain the stacktape executable."
    chmod +x "$staging_dir/stacktape"
    [ -f "$staging_dir/esbuild/exec" ] && chmod +x "$staging_dir/esbuild/exec"

    # Payloads that earlier releases bundled and newer ones omit: stale MCP documentation, an obsolete production
    # source map, and the pack, nixpacks and Session Manager plugin binaries (the CLI downloads its tools on first use).
    rm -rf "$INSTALL_DIR/llm-docs" "$INSTALL_DIR/ai-docs" "$INSTALL_DIR/compiled-cli.js.map" \
        "$INSTALL_DIR/pack" "$INSTALL_DIR/nixpacks" "$INSTALL_DIR/session-manager-plugin"
    for entry in "$staging_dir"/* "$staging_dir"/.[!.]*; do
        [ -e "$entry" ] || continue
        name=${entry##*/}
        if [ -d "$entry" ]; then
            rm -rf "${INSTALL_DIR:?}/$name"
        fi
        mv -f "$entry" "$INSTALL_DIR/$name"
    done
    ln -sf "$INSTALL_DIR/stacktape" "$INSTALL_DIR/stp"
}

# Sets `config_file` to the shell configuration file that should put the CLI on PATH, or leaves it empty.
find_shell_config() {
    xdg_config_home=${XDG_CONFIG_HOME:-$HOME/.config}
    case $current_shell in
        fish) config_files="$xdg_config_home/fish/config.fish" ;;
        zsh) config_files="${ZDOTDIR:-$HOME}/.zshrc ${ZDOTDIR:-$HOME}/.zshenv $xdg_config_home/zsh/.zshrc" ;;
        bash) config_files="$HOME/.bashrc $HOME/.bash_profile $HOME/.profile" ;;
        sh | ash | dash) config_files="$HOME/.profile" ;;
        *) config_files="$HOME/.bashrc $HOME/.profile" ;;
    esac
    config_file=''
    for file in $config_files; do
        if [ -f "$file" ]; then
            config_file=$file
            return
        fi
    done
    # A new account has no configuration file yet: macOS gives it zsh, Alpine and Docker images give it sh or ash.
    # Create the file the shell reads, as other CLI installers do, so the next terminal finds the CLI.
    case $current_shell in
        zsh) config_file="${ZDOTDIR:-$HOME}/.zshrc" ;;
        sh | ash | dash | '') config_file="$HOME/.profile" ;;
        *) return ;;
    esac
    touch "$config_file" 2>/dev/null || config_file=''
}

completions_line() {
    case $current_shell in
        bash) completions_file="$INSTALL_DIR/completions/bash.sh" ;;
        zsh) completions_file="$INSTALL_DIR/completions/zsh.sh" ;;
        *) return ;;
    esac
    [ -f "$completions_file" ] || return 0
    grep -Fq "$completions_file" "$config_file" 2>/dev/null && return
    printf '[ -s "%s" ] && . "%s"\n' "$completions_file" "$completions_file"
}

# Adds the installation to PATH for new shells. Sets `path_added` when the current shell does not have it yet.
setup_path() {
    path_added=false
    if [ -n "${GITHUB_ACTIONS:-}" ] && [ "$GITHUB_ACTIONS" = true ] && [ -n "${GITHUB_PATH:-}" ]; then
        say "$INSTALL_DIR" >>"$GITHUB_PATH"
        say "${MUTED}Added ${NC}$INSTALL_DIR${MUTED} to GITHUB_PATH${NC}"
    fi
    case ":$PATH:" in *":$INSTALL_DIR:"*) return ;; esac
    if [ -n "${STACKTAPE_NO_MODIFY_PATH:-}" ]; then
        return
    fi
    current_shell=${SHELL:-}
    current_shell=${current_shell##*/}
    find_shell_config
    if [ "$current_shell" = fish ]; then
        path_line="fish_add_path $INSTALL_DIR"
    else
        path_line="export PATH=\"$INSTALL_DIR:\$PATH\""
    fi
    if [ -z "$config_file" ]; then
        say "${MUTED}Add stacktape to PATH in your shell's configuration:${NC} $path_line"
        return
    fi
    path_added=true
    if grep -Fq "$INSTALL_DIR" "$config_file" 2>/dev/null; then
        return
    fi
    if [ ! -w "$config_file" ]; then
        say "${MUTED}Add stacktape to PATH in ${NC}$(tildify "$config_file")${MUTED}:${NC} $path_line"
        path_added=false
        return
    fi
    {
        printf '\n# stacktape\n%s\n' "$path_line"
        completions_line
    } >>"$config_file"
    say "${MUTED}Added ${NC}$(tildify "$INSTALL_DIR")${MUTED} to PATH in ${NC}$(tildify "$config_file")"
}

print_logo() {
    say ''
    say "${MUTED}     ▄             ▄    ${NC}▄"
    say "${MUTED}█▀▀▀ █▀▀ ▀▀▀█ █▀▀▀ █ ▄▀ ${NC}█▀▀ ▀▀▀█ █▀▀█ █▀▀█"
    say "${MUTED}▀▀▀█ █░░ █▀▀█ █░░░ █▀▄  ${NC}█░░ █▀▀█ █░░█ █▀▀▀"
    say "${MUTED}▀▀▀▀ ▀▀▀ ▀▀▀▀ ▀▀▀▀ ▀  ▀ ${NC}▀▀▀ ▀▀▀▀ █▀▀▀ ▀▀▀▀"
    say ''
}

main() {
    setup_colors
    command -v curl >/dev/null 2>&1 || fail "'curl' is required but not installed."
    command -v tar >/dev/null 2>&1 || fail "'tar' is required but not installed."
    # Under sudo, the files would belong to root, and on macOS they would still land in your home directory.
    if [ "$(id -u)" = 0 ] && [ -n "${SUDO_USER:-}" ] && [ -z "${STACKTAPE_ALLOW_SUDO:-}" ]; then
        fail "Run the installer without sudo. Stacktape installs into your home directory and needs no root access." \
            "To install it for the root user on purpose, set STACKTAPE_ALLOW_SUDO=1."
    fi

    version=${STACKTAPE_VERSION:-"<<DEFAULT_VERSION>>"}
    detect_platform

    mkdir -p "$INSTALL_DIR"
    work_dir=$(mktemp -d "$HOME/.stacktape/.install.XXXXXX")
    trap cleanup EXIT
    trap 'exit 130' INT
    trap 'exit 143' TERM

    if [ -e "$INSTALL_DIR/stacktape" ]; then
        updating=true
        say ''
        say "${MUTED}Updating ${NC}stacktape${MUTED} to ${NC}$version"
    else
        updating=false
        say ''
        say "${MUTED}Installing ${NC}stacktape $version${MUTED} for $platform_name${NC}"
    fi

    archive_path="$work_dir/$archive_name"
    download "$RELEASES_URL/download/$version/$archive_name" "$archive_path" ||
        fail "Could not download Stacktape $version for $platform_name." \
            "Check that the release exists: $RELEASES_URL/tag/$version"
    if checksum_required_for_version "$version"; then
        verify_checksum "$archive_path"
    fi
    install_archive "$archive_path"
    cleanup
    trap - EXIT INT TERM
    setup_path

    if [ -t 1 ]; then
        print_logo
    else
        say "Installed stacktape $version in $(tildify "$INSTALL_DIR")"
    fi

    if [ "$#" -gt 0 ]; then
        run_cli "$@"
    elif [ "$updating" = true ]; then
        say "${MUTED}Release notes: ${NC}$RELEASES_URL/tag/$version"
        say ''
    else
        say "${MUTED}To get started:${NC}"
        say ''
        if [ "$path_added" = true ]; then
            say "exec \$SHELL      ${MUTED}# Reload PATH (or open a new terminal)${NC}"
        fi
        say "cd <project>     ${MUTED}# Open your project${NC}"
        say "stacktape init   ${MUTED}# Set it up to deploy to your AWS account${NC}"
        say ''
        say "${MUTED}For more information visit ${NC}https://docs.stacktape.com"
        say ''
    fi
}

# Arguments after the installer's own run the installed CLI, so `curl ... | sh -s -- init` installs Stacktape and starts
# `stacktape init`. The PATH entry added above applies only to new shells, so the CLI runs by its full path.
run_cli() {
    say "${MUTED}Starting ${NC}stacktape $*"
    if [ "$path_added" = true ]; then
        say "${MUTED}Afterwards, open a new terminal to use stacktape.${NC}"
    fi
    say ''
    export PATH="$INSTALL_DIR:$PATH"
    # With `curl | sh`, standard input is the rest of the downloaded script, so the CLI reads from the terminal instead.
    # Without a terminal (CI, a coding agent's shell), it gets empty input, as in any non-interactive shell.
    if [ -t 0 ]; then
        exec "$INSTALL_DIR/stacktape" "$@"
    elif (: </dev/tty) 2>/dev/null; then
        exec "$INSTALL_DIR/stacktape" "$@" </dev/tty
    else
        exec "$INSTALL_DIR/stacktape" "$@" </dev/null
    fi
}

main "$@"
