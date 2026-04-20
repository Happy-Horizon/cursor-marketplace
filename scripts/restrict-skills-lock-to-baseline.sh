#!/usr/bin/env bash
# After `npx skills update`, the skills CLI may add every skill from a multi-skill
# repo (e.g. anthropics/skills). CI should only refresh hashes/content for skills
# already pinned in git — never grow the lockfile or vendor trees on automation.
#
# Prerequisites: jq
# Env:
#   BASELINE_LOCK — path to skills-lock.json copied before `skills update` (required)

set -euo pipefail

BASELINE_LOCK="${BASELINE_LOCK:-}"
if [[ -z "$BASELINE_LOCK" || ! -f "$BASELINE_LOCK" ]]; then
  echo "BASELINE_LOCK must point to the pre-update skills-lock.json copy." >&2
  exit 1
fi

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCK="$ROOT/synced-vendor-skills/skills-lock.json"
SKILLS_DIR="$ROOT/synced-vendor-skills/.agents/skills"

TMP="$(mktemp)"
jq --argjson baseline "$(cat "$BASELINE_LOCK")" '
  ($baseline) as $b |
  . as $c |
  ($b.skills | keys_unsorted) as $keys |
  {
    version: ($c.version // $b.version),
    skills: (
      reduce $keys[] as $k ({};
        . + {
          ($k): (
            if ($c.skills[$k] != null) then $c.skills[$k]
            else $b.skills[$k]
            end
          )
        }
      )
    )
  }
' "$LOCK" >"$TMP"
mv "$TMP" "$LOCK"

if [[ -d "$SKILLS_DIR" ]]; then
  while IFS= read -r -d '' dir; do
    name="$(basename "$dir")"
    if ! jq -e --arg k "$name" '.skills | has($k)' "$BASELINE_LOCK" >/dev/null 2>&1; then
      rm -rf "$dir"
      echo "Removed skill tree not in baseline lock: $name"
    fi
  done < <(find "$SKILLS_DIR" -mindepth 1 -maxdepth 1 -type d -print0 2>/dev/null || true)
fi

echo "Restricted $LOCK to keys from baseline ($(basename "$BASELINE_LOCK"))."
