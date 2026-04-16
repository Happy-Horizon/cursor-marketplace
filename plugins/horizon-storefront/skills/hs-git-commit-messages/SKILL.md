---
name: hs-git-commit-messages
description: >-
  Draft git commit subjects and bodies in this repo’s format. Use when the user
  asks for a commit message, git commit text, or commit/PR description for changes.
  Asks for TICKET or TYPE when unclear; never invents ticket numbers.
---

# Git commit messages (this repo)

Full spec: [git-commit-messages.mdc](../../rules/git-commit-messages.mdc) (always-on rule in this repo—follow it).

## Checklist

1. Subject: `[TYPE][TICKET] Summary` (imperative mood); one space after the second `]`.
2. Infer `TICKET` from branch / PR / thread when unambiguous; **if missing or ambiguous, ask**—never invent a ticket.
3. Infer `TYPE` from **this commit’s** actual change; branch prefix is a hint only. **If FEATURE vs BUGFIX vs REFACTOR or HOTFIX vs BUGFIX is unclear, ask briefly.**
4. Multiline: blank line, then `- ` bullets—meaningful deltas only, concise (see rule “Body tone”).
5. `HOTFIX` only for rare production / immediate-ship fixes; routine fixes on dev/feature branches are `BUGFIX`.

Do not duplicate the rule file here; open or follow the linked `.mdc` for examples, branch defaults, and edge cases.
