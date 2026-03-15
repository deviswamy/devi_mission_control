#!/usr/bin/env bash
# Lisa Plan - Start specification interview
# Handler for /lisa plan subcommand

set -euo pipefail

# Get project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
LISA_SCRIPT="$PROJECT_ROOT/lisa/lisa.sh"

# Check if Lisa is available
if [ ! -f "$LISA_SCRIPT" ]; then
    echo "Error: Lisa not found at $LISA_SCRIPT"
    exit 1
fi

# Forward all arguments to lisa.sh plan command
exec "$LISA_SCRIPT" plan "$@"
