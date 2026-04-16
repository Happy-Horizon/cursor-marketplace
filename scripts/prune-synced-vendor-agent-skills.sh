#!/usr/bin/env bash
# After `npx skills update`, the skills CLI may create symlink trees under many
# agent roots (.claude/skills, .augment/skills, …). This repo only tracks the
# canonical copy under synced-vendor-skills/.agents/skills/ (wired into the
# horizon-frontend-foundations plugin). Remove the rest so PRs stay small.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/synced-vendor-skills"

if [[ ! -d "$DIR" ]]; then
  echo "synced-vendor-skills not found at $DIR" >&2
  exit 1
fi

cd "$DIR"

shopt -s nullglob dotglob

for path in *; do
  if [[ -f "$path" ]]; then
    continue
  fi
  if [[ ! -d "$path" ]]; then
    continue
  fi
  case "$path" in
    .agents | rules-frontend-foundations) continue ;;
  esac
  if [[ -d "$path/skills" ]]; then
    rm -rf "$path/skills"
  fi
done

if [[ -e skills ]]; then
  rm -rf skills
fi

# Drop now-empty agent roots (e.g. .claude/ after removing .claude/skills).
find . -mindepth 1 -type d -empty -delete 2>/dev/null || true

echo "Pruned agent skill links under $DIR (kept .agents/skills and rules-frontend-foundations)."
