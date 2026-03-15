#!/bin/bash
# Copies plans from ~/.claude/plans to the project's .claude/plans/ directory

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PLANS_SRC="$HOME/.claude/plans"
PLANS_DEST="$PROJECT_DIR/.claude/plans"

if [[ ! -d "$PLANS_SRC" ]]; then
  exit 0
fi

mkdir -p "$PLANS_DEST"

find "$PLANS_SRC" -maxdepth 1 -name "*.md" | while read -r plan; do
  filename="$(basename "$plan")"
  cp "$plan" "$PLANS_DEST/$filename"
  echo "Saved plan: $filename"
done
