#!/bin/bash
# Test script to preview the installation output formatting
# 
# To test in a real terminal (to see colors), run:
#   sh scripts/test-install-output.sh
#
# Or test the actual install script dry-run (won't download, just shows output):
#   STACKTAPE_VERSION=test sh -c 'exec 2>&1; . scripts/install-scripts/macos-arm.sh' 2>&1 || true

# Colors (ANSI escape codes)
MUTED='\033[0;2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

echo ""
echo "=== Testing Install Script Output Preview ==="
echo ""

# Simulate the install messages
printf "${MUTED}Installing stacktape version: 4.9.0${NC}\n"
echo ""

# Simulate progress bar
printf "${CYAN}####################--------------------  50%%${NC}\n"
printf "${CYAN}########################################  100%%${NC}\n"
echo ""

printf "${MUTED}Added stacktape to \$PATH in ~/.zshrc${NC}\n"
echo ""

# Print the ASCII logo (same as in install scripts)
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

echo "=== End of Test ==="
echo ""
echo "To test the actual macos-arm install script (will download):"
echo "  sh scripts/install-scripts/macos-arm.sh"
echo ""
