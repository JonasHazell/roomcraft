# Committed PR media

Media committed here is referenced from pull-request descriptions as a clickable
markdown **link to this folder** (a tree-view URL), so a reviewer can open the
screenshots even on PRs opened through the GitHub API or the CLI — where
drag-and-drop upload isn't available and the posting layer strips both inline
image embeds and any link whose URL ends in an image extension. The committed
files also render in the PR's "Files changed" tab. Inline rendering in the body
is only possible when a human drags a file into the web PR editor.

Use `node scripts/pr-media.mjs <file...>` to drop screenshots in here and print
the ready-to-paste folder link. See docs/AGENT_BUILD.md and the PR template.
