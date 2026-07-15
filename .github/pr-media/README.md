# Committed PR media

Images committed here are embedded in pull-request descriptions via absolute
raw URLs, so they render inline (and stay clickable) even for PRs opened through
the GitHub API or the CLI — where drag-and-drop upload is not available.

Use `node scripts/pr-media.mjs <file...>` to drop screenshots in here and print
the ready-to-paste markdown. See docs/AGENT_BUILD.md and the PR template.
